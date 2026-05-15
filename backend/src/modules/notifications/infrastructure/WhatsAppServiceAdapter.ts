import { Client as WhatsAppWebClient, LocalAuth } from 'whatsapp-web.js';
import { injectable } from "tsyringe";
import { logger } from "../../../utils/logger";
import { Checklist, Client as ClientModel, User } from "../../../models";

export type WhatsAppConnectionStatus = 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATED' | 'DISCONNECTED';

export interface WhatsAppStatusResponse {
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  message: string;
  connected: boolean;
  device: { platform?: string; pushname?: string; wid?: string } | null;
}

interface VerifiedWhatsAppClient {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  businessName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  mobile?: string | null;
  email?: string | null;
  city?: string | null;
  stateCode?: string | null;
  user?: {
    mobile?: string | null;
    email?: string | null;
    isActive?: boolean;
  };
}

@injectable()
export class WhatsAppServiceAdapter {
  private static client: WhatsAppWebClient | null = null;
  private static initializing: Promise<void> | null = null;
  private static status: WhatsAppConnectionStatus = 'DISCONNECTED';
  private static qrCode: string | null = null;
  private static lastActivity = Date.now();
  private static readyInfo: WhatsAppStatusResponse['device'] = null;
  private static processedIncomingIds = new Set<string>();
  private static activeOrganizationId: string | null = null;

  setActiveOrganization(organizationId?: string | null): void {
    if (organizationId) WhatsAppServiceAdapter.activeOrganizationId = organizationId;
  }

  async sendOTP(mobile: string, otp: string): Promise<void> {
    await this.sendMessage(mobile, `Your AccuDocs OTP is ${otp}`);
  }

  async getQR(): Promise<WhatsAppStatusResponse> {
    this.ensureClient();

    if (WhatsAppServiceAdapter.status === 'INITIALIZING') {
      await this.waitForStatus(['QR_READY', 'AUTHENTICATED', 'DISCONNECTED'], 15000);
    }

    return this.getStatus();
  }

  async getStatus(): Promise<WhatsAppStatusResponse> {
    this.ensureClient();

    return {
      status: WhatsAppServiceAdapter.status,
      qrCode: WhatsAppServiceAdapter.qrCode,
      connected: WhatsAppServiceAdapter.status === 'AUTHENTICATED',
      device: WhatsAppServiceAdapter.readyInfo,
      message: this.statusMessage(WhatsAppServiceAdapter.status),
    };
  }

  async sendMessage(to: string, message: string): Promise<{ sent: boolean; to: string; id?: string }> {
    await this.requireAuthenticated();

    const chatId = await this.resolveChatId(to);
    let result: any;
    try {
      result = await WhatsAppServiceAdapter.client!.sendMessage(chatId, message);
    } catch (error) {
      logger.warn('WhatsApp sendMessage failed', error);
      throw this.toOperationalError(
        this.friendlyWhatsAppError(error, 'Unable to send WhatsApp message. Verify the client number or ask the client to message first.'),
        400,
        'WHATSAPP_SEND_FAILED'
      );
    }

    WhatsAppServiceAdapter.lastActivity = Date.now();

    return {
      sent: true,
      to: chatId,
      id: result.id?._serialized,
    };
  }

  async getSession(mobile?: string): Promise<any | null> {
    const status = await this.getStatus();
    if (!status.connected) return null;

    return {
      state: status.status,
      clientCode: mobile || status.device?.wid || 'WhatsApp Web',
      lastActivity: WhatsAppServiceAdapter.lastActivity,
      device: status.device,
    };
  }

  async clearSession(): Promise<{ success: boolean; message: string }> {
    return this.logout();
  }

  async getChats(): Promise<any[]> {
    await this.requireAuthenticated();

    try {
      const chats = await WhatsAppServiceAdapter.client!.getChats();
      return chats.slice(0, 50).map((chat: any) => this.normalizeChat(chat));
    } catch (error) {
      logger.warn('WhatsApp getChats failed; using Store fallback', error);
      return this.getChatsFromStore();
    }
  }

  async getChatMessages(chatId: string, limit = 50): Promise<any[]> {
    await this.requireAuthenticated();

    try {
      const chat = await WhatsAppServiceAdapter.client!.getChatById(chatId);
      if (!chat) return [];

      const messages = await chat.fetchMessages({ limit });
      return messages.map((message: any) => this.normalizeMessage(message));
    } catch (error) {
      logger.warn(`WhatsApp getChatMessages failed for ${chatId}; using Store fallback`, error);
      return this.getMessagesFromStore(chatId, limit);
    }
  }

  private normalizeChat(chat: any): any {
    return {
      id: chat.id?._serialized,
      name: chat.name || chat.formattedTitle || chat.id?.user || chat.id?._serialized,
      unreadCount: chat.unreadCount || 0,
      lastMessage: chat.lastMessage
        ? {
            body: chat.lastMessage.body || '',
            timestamp: chat.lastMessage.timestamp || Math.floor(Date.now() / 1000),
        }
        : null,
    };
  }

  private normalizeMessage(message: any): any {
    return {
      id: message.id?._serialized,
      from: message.fromMe ? 'You (Admin)' : message.from,
      body: message.body || '',
      timestamp: message.timestamp || Math.floor(Date.now() / 1000),
      fromMe: Boolean(message.fromMe),
    };
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    if (WhatsAppServiceAdapter.client) {
      try {
        await WhatsAppServiceAdapter.client.logout();
      } catch (error) {
        logger.warn('WhatsApp logout failed, destroying client instead', error);
      }

      try {
        await WhatsAppServiceAdapter.client.destroy();
      } catch (error) {
        logger.warn('WhatsApp destroy failed', error);
      }
    }

    WhatsAppServiceAdapter.client = null;
    WhatsAppServiceAdapter.initializing = null;
    WhatsAppServiceAdapter.qrCode = null;
    WhatsAppServiceAdapter.readyInfo = null;
    WhatsAppServiceAdapter.status = 'DISCONNECTED';
    WhatsAppServiceAdapter.lastActivity = Date.now();

    return { success: true, message: 'WhatsApp session disconnected' };
  }

  private ensureClient(): void {
    if (WhatsAppServiceAdapter.client || WhatsAppServiceAdapter.initializing) return;

    WhatsAppServiceAdapter.status = 'INITIALIZING';
    WhatsAppServiceAdapter.qrCode = null;

    const client = new WhatsAppWebClient({
      authStrategy: new LocalAuth({ clientId: 'accudocs-main' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
        ],
      },
    });

    WhatsAppServiceAdapter.client = client;
    this.bindClientEvents(client);

    WhatsAppServiceAdapter.initializing = client.initialize()
      .then(() => {
        WhatsAppServiceAdapter.initializing = null;
      })
      .catch((error: unknown) => {
        logger.error('WhatsApp client initialization failed', error);
        WhatsAppServiceAdapter.initializing = null;
        WhatsAppServiceAdapter.status = 'DISCONNECTED';
        WhatsAppServiceAdapter.qrCode = null;
      });
  }

  private bindClientEvents(client: WhatsAppWebClient): void {
    client.on('qr', (qr: string) => {
      WhatsAppServiceAdapter.qrCode = qr;
      WhatsAppServiceAdapter.status = 'QR_READY';
      WhatsAppServiceAdapter.lastActivity = Date.now();
      logger.info('WhatsApp QR generated. Open /settings/whatsapp and scan it.');
    });

    client.on('authenticated', () => {
      WhatsAppServiceAdapter.status = 'AUTHENTICATED';
      WhatsAppServiceAdapter.qrCode = null;
      WhatsAppServiceAdapter.lastActivity = Date.now();
      logger.info('WhatsApp authenticated');
    });

    client.on('ready', (async () => {
      WhatsAppServiceAdapter.status = 'AUTHENTICATED';
      WhatsAppServiceAdapter.qrCode = null;
      WhatsAppServiceAdapter.lastActivity = Date.now();

      try {
        const info = client.info;
        WhatsAppServiceAdapter.readyInfo = {
          platform: info?.platform,
          pushname: info?.pushname,
          wid: info?.wid?._serialized,
        };
      } catch {
        WhatsAppServiceAdapter.readyInfo = null;
      }

      logger.info('WhatsApp client ready');
    }) as any);

    client.on('message', ((message: any) => {
      void this.handleIncomingMessage(message);
    }) as any);

    client.on('disconnected', (reason: string) => {
      logger.warn(`WhatsApp disconnected: ${reason}`);
      WhatsAppServiceAdapter.status = 'DISCONNECTED';
      WhatsAppServiceAdapter.qrCode = null;
      WhatsAppServiceAdapter.readyInfo = null;
      WhatsAppServiceAdapter.client = null;
      WhatsAppServiceAdapter.initializing = null;
    });

    client.on('auth_failure', (message: string) => {
      logger.error(`WhatsApp auth failure: ${message}`);
      WhatsAppServiceAdapter.status = 'DISCONNECTED';
      WhatsAppServiceAdapter.qrCode = null;
      WhatsAppServiceAdapter.readyInfo = null;
    });
  }

  private async requireAuthenticated(): Promise<void> {
    this.ensureClient();

    if (WhatsAppServiceAdapter.status === 'INITIALIZING') {
      await this.waitForStatus(['AUTHENTICATED', 'QR_READY', 'DISCONNECTED'], 8000);
    }

    if (WhatsAppServiceAdapter.status !== 'AUTHENTICATED') {
      throw new Error('WhatsApp is not connected. Scan the QR code first.');
    }
  }

  private waitForStatus(statuses: WhatsAppConnectionStatus[], timeoutMs: number): Promise<void> {
    if (statuses.includes(WhatsAppServiceAdapter.status)) return Promise.resolve();

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (statuses.includes(WhatsAppServiceAdapter.status) || Date.now() - startedAt >= timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  }

  private toChatId(value: string): string {
    if (value.includes('@c.us') || value.includes('@g.us')) return value;

    let digits = value.replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    return `${digits}@c.us`;
  }

  private async resolveChatId(value: string): Promise<string> {
    if (value.includes('@g.us')) return value;
    if (value.includes('@c.us')) return value;

    let digits = value.replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    const fallback = `${digits}@c.us`;

    try {
      const numberId = await (WhatsAppServiceAdapter.client as any)?.getNumberId?.(fallback);
      return numberId?._serialized || fallback;
    } catch (error) {
      logger.warn(`WhatsApp getNumberId failed for ${fallback}; using direct chat id`, error);
      return fallback;
    }
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      if (!message || message.fromMe || message.isStatus) return;

      const from = String(message.from || '');
      if (!from || from === 'status@broadcast' || from.includes('@g.us')) return;

      const messageId = String(message.id?._serialized || `${from}:${message.timestamp || Date.now()}`);
      if (WhatsAppServiceAdapter.processedIncomingIds.has(messageId)) return;
      WhatsAppServiceAdapter.processedIncomingIds.add(messageId);
      if (WhatsAppServiceAdapter.processedIncomingIds.size > 500) {
        WhatsAppServiceAdapter.processedIncomingIds = new Set([...WhatsAppServiceAdapter.processedIncomingIds].slice(-250));
      }

      WhatsAppServiceAdapter.lastActivity = Date.now();

      const contactCandidates = await this.getIncomingContactCandidates(message);
      const verifiedClient = await this.findVerifiedClient(contactCandidates);
      if (!verifiedClient) {
        logger.warn(
          `WhatsApp bot could not match sender ${from} in organization ${WhatsAppServiceAdapter.activeOrganizationId || 'unknown'}`
        );
        await message.reply(
          'Sorry, this WhatsApp number is not registered with AccuDocs. Please message from the mobile number saved in your client profile or contact your CA firm.'
        );
        return;
      }

      const body = String(message.body || '').trim();

      if (message.hasMedia) {
        await message.reply(
          `Thanks ${verifiedClient.name}. We received your file. Our team will review it and attach it to your client work if required.`
        );
        return;
      }

      const intent = this.detectBotIntent(body);
      const reply = await this.buildBotReply(intent, verifiedClient);
      if (reply) await message.reply(reply);
    } catch (error) {
      logger.warn('WhatsApp bot failed to process incoming message', error);
    }
  }

  private async getIncomingContactCandidates(message: any): Promise<string[]> {
    const candidates = new Set<string>();

    for (const value of [
      message.from,
      message.author,
      message.to,
      message._data?.from,
      message._data?.author,
      message._data?.notifyName,
    ]) {
      if (value) candidates.add(String(value));
    }

    try {
      const contact = await message.getContact?.();
      for (const value of [
        contact?.number,
        contact?.pushname,
        contact?.name,
        contact?.shortName,
        contact?.id?._serialized,
        contact?.id?.user,
      ]) {
        if (value) candidates.add(String(value));
      }
    } catch (error) {
      logger.warn('WhatsApp bot could not read incoming contact details', error);
    }

    return [...candidates];
  }

  private async findVerifiedClient(senderCandidates: string[]): Promise<VerifiedWhatsAppClient | null> {
    const senderKeys = [...new Set(senderCandidates.flatMap((candidate) => this.phoneKeys(candidate)))];
    if (!senderKeys.length) return null;

    const clients = await ClientModel.findAll({
      where: {
        isActive: true,
        ...(WhatsAppServiceAdapter.activeOrganizationId
          ? { organizationId: WhatsAppServiceAdapter.activeOrganizationId }
          : {}),
      },
      attributes: [
        'id',
        'organizationId',
        'code',
        'name',
        'businessName',
        'gstin',
        'pan',
        'mobile',
        'email',
        'city',
        'stateCode',
      ],
      include: [
        { model: User, as: 'user', attributes: ['mobile', 'email', 'isActive'] },
      ],
      limit: 5000,
    });

    const matches = (clients as any[])
      .map((clientModel) => clientModel.get({ plain: true }) as VerifiedWhatsAppClient)
      .filter((client) => client.user?.isActive !== false)
      .filter((client) => {
        const clientKeys = new Set([
          ...this.phoneKeys(client.mobile),
          ...this.phoneKeys(client.user?.mobile),
        ]);
        return senderKeys.some((key) => clientKeys.has(key));
      });

    const organizationIds = new Set(matches.map((client) => client.organizationId));
    if (!WhatsAppServiceAdapter.activeOrganizationId && organizationIds.size > 1) {
      logger.warn(`WhatsApp bot found duplicate client mobile across organizations for ${senderCandidates.join(', ')}`);
      return null;
    }

    return matches[0] || null;
  }

  private detectBotIntent(body: string): 'greeting' | 'info' | 'files' | 'help' | 'unknown' {
    const text = body.toLowerCase();
    if (!text || /^(hi|hey|hello|hii|helo|namaste|start|menu)$/i.test(text)) return 'greeting';
    if (['1', 'info', 'information', 'details', 'profile', 'account'].includes(text)) return 'info';
    if (['2', 'file', 'files', 'document', 'documents', 'upload', 'checklist'].includes(text)) return 'files';
    if (['3', 'help', 'support', 'call', 'contact', 'human'].includes(text)) return 'help';
    if (/\b(info|profile|account|details)\b/.test(text)) return 'info';
    if (/\b(file|files|document|documents|upload|checklist)\b/.test(text)) return 'files';
    if (/\b(help|support|contact|call|human)\b/.test(text)) return 'help';
    return 'unknown';
  }

  private async buildBotReply(
    intent: 'greeting' | 'info' | 'files' | 'help' | 'unknown',
    client: VerifiedWhatsAppClient
  ): Promise<string> {
    if (intent === 'info') return this.buildClientInfoReply(client);
    if (intent === 'files') return this.buildFileRequestReply(client);
    if (intent === 'help') {
      return `Hi ${client.name}, your request is noted. Our team will contact you shortly.\n\nYou can also reply INFO for profile details or FILE for pending document requests.`;
    }
    if (intent === 'unknown') {
      return `Hi ${client.name}, I can help with these options:\n\n1. INFO - client profile details\n2. FILE - pending document/file requests\n3. HELP - ask our team to contact you`;
    }

    return `Hi ${client.name}, verified successfully with AccuDocs.\n\nReply with:\n1. INFO - your client profile details\n2. FILE - pending document/file requests\n3. HELP - contact the office team`;
  }

  private buildClientInfoReply(client: VerifiedWhatsAppClient): string {
    const lines = [
      'Your AccuDocs client details:',
      `Client Code: ${client.code}`,
      `Name: ${client.name}`,
    ];

    if (client.businessName) lines.push(`Business: ${client.businessName}`);
    if (client.gstin) lines.push(`GSTIN: ${client.gstin}`);
    if (client.pan) lines.push(`PAN: ${this.maskSensitive(client.pan)}`);
    if (client.email || client.user?.email) lines.push(`Email: ${client.email || client.user?.email}`);
    if (client.mobile || client.user?.mobile) lines.push(`Mobile: ${client.mobile || client.user?.mobile}`);
    if (client.city || client.stateCode) lines.push(`Location: ${[client.city, client.stateCode].filter(Boolean).join(', ')}`);

    lines.push('', 'Reply FILE to see pending document requests.');
    return lines.join('\n');
  }

  private async buildFileRequestReply(client: VerifiedWhatsAppClient): Promise<string> {
    const checklists = await Checklist.findAll({
      where: { clientId: client.id, status: 'active' },
      attributes: [
        'id',
        'name',
        'financialYear',
        'serviceType',
        'items',
        'progress',
        'totalItems',
        'receivedItems',
        'dueDate',
      ],
      order: [['updatedAt', 'DESC']],
      limit: 3,
    });

    if (!checklists.length) {
      return `Hi ${client.name}, there are no active document requests right now.\n\nYou can still send a file here and our team will review it.`;
    }

    const lines = [`Hi ${client.name}, these are your pending document requests:`];

    for (const checklistModel of checklists as any[]) {
      const checklist = checklistModel.get({ plain: true });
      const pendingItems = Array.isArray(checklist.items)
        ? checklist.items.filter((item: any) => item?.status === 'pending')
        : [];
      const dueDate = checklist.dueDate ? `, due ${this.formatDate(checklist.dueDate)}` : '';
      const missing = pendingItems
        .slice(0, 4)
        .map((item: any) => item.label)
        .join(', ');
      const extra = pendingItems.length > 4 ? `, +${pendingItems.length - 4} more` : '';

      lines.push(
        '',
        `${checklist.name || checklist.serviceType} (${checklist.financialYear}${dueDate})`,
        `Received: ${checklist.receivedItems || 0}/${checklist.totalItems || 0}`
      );
      if (missing) lines.push(`Pending: ${missing}${extra}`);
    }

    lines.push('', 'You can send the requested file here. Our team will review and attach it to your work.');
    return lines.join('\n');
  }

  private phoneKeys(value?: string | null): string[] {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return [];

    const withoutCountryCode = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
    const keys = new Set<string>([digits, withoutCountryCode]);
    if (digits.length > 10) keys.add(digits.slice(-10));
    if (digits.length === 10) keys.add(`91${digits}`);

    return [...keys].filter((key) => key.length >= 10);
  }

  private maskSensitive(value: string): string {
    if (value.length <= 4) return value;
    return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
  }

  private formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private async getChatsFromStore(): Promise<any[]> {
    const page = (WhatsAppServiceAdapter.client as any)?.pupPage;
    if (!page) return [];

    try {
      return await page.evaluate(() => {
        const store = (globalThis as any).Store;
        const chats = store?.Chat?.getModelsArray?.() || [];
        return chats
          .filter((chat: any) => chat?.id?._serialized && chat.id._serialized !== 'status@broadcast')
          .slice(0, 50)
          .map((chat: any) => {
            const id = chat.id?._serialized;
            const lastMessage = chat.lastMessage || chat.msgs?.getModelsArray?.()?.slice(-1)?.[0] || null;
            return {
              id,
              name: chat.name || chat.formattedTitle || chat.contact?.formattedName || chat.contact?.pushname || chat.id?.user || id,
              unreadCount: chat.unreadCount || chat.unread || 0,
              lastMessage: lastMessage
                ? {
                    body: lastMessage.body || lastMessage.caption || '',
                    timestamp: lastMessage.t || lastMessage.timestamp || Math.floor(Date.now() / 1000),
                  }
                : null,
            };
          });
      });
    } catch (error) {
      logger.warn('WhatsApp Store chat fallback failed', error);
      return [];
    }
  }

  private async getMessagesFromStore(chatId: string, limit: number): Promise<any[]> {
    const page = (WhatsAppServiceAdapter.client as any)?.pupPage;
    if (!page) return [];

    try {
      return await page.evaluate(async (targetChatId: string, targetLimit: number) => {
        const store = (globalThis as any).Store;
        if (!store?.Chat || !store?.WidFactory) return [];

        const wid = store.WidFactory.createWid(targetChatId);
        const chat = store.Chat.get(wid);
        if (!chat) return [];

        const rawMessages = chat.msgs?.getModelsArray?.() || [];
        return rawMessages
          .filter((message: any) => !message.isNotification)
          .slice(-targetLimit)
          .map((message: any) => ({
            id: message.id?._serialized,
            from: message.id?.fromMe ? 'You (Admin)' : (message.from?._serialized || message.from || targetChatId),
            body: message.body || message.caption || '',
            timestamp: message.t || message.timestamp || Math.floor(Date.now() / 1000),
            fromMe: Boolean(message.id?.fromMe || message.fromMe),
          }));
      }, chatId, limit);
    } catch (error) {
      logger.warn('WhatsApp Store message fallback failed', error);
      return [];
    }
  }

  private friendlyWhatsAppError(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message : String(error || '');
    if (message.includes('No LID for user')) {
      return 'WhatsApp could not resolve this phone number yet. Verify the number or ask the client to message first.';
    }
    if (message.includes('not connected')) {
      return 'WhatsApp is not connected. Scan the QR code first.';
    }
    return fallback;
  }

  private toOperationalError(message: string, statusCode: number, errorCode: string): Error {
    const error = new Error(message) as Error & { statusCode: number; errorCode: string; isOperational: boolean };
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    error.isOperational = true;
    return error;
  }

  private statusMessage(status: WhatsAppConnectionStatus): string {
    const messages: Record<WhatsAppConnectionStatus, string> = {
      INITIALIZING: 'Starting WhatsApp client. Please wait for QR.',
      QR_READY: 'Scan the QR code with WhatsApp on your phone.',
      AUTHENTICATED: 'WhatsApp is connected.',
      DISCONNECTED: 'WhatsApp is disconnected. Reset connection to generate QR.',
    };
    return messages[status];
  }
}
