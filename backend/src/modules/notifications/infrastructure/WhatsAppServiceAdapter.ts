import { Client, LocalAuth } from 'whatsapp-web.js';
import { injectable } from "tsyringe";
import { logger } from "../../../utils/logger";

export type WhatsAppConnectionStatus = 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATED' | 'DISCONNECTED';

export interface WhatsAppStatusResponse {
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  message: string;
  connected: boolean;
  device: { platform?: string; pushname?: string; wid?: string } | null;
}

@injectable()
export class WhatsAppServiceAdapter {
  private static client: Client | null = null;
  private static initializing: Promise<void> | null = null;
  private static status: WhatsAppConnectionStatus = 'DISCONNECTED';
  private static qrCode: string | null = null;
  private static lastActivity = Date.now();
  private static readyInfo: WhatsAppStatusResponse['device'] = null;

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

    const chatId = this.toChatId(to);
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

    const client = new Client({
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

  private bindClientEvents(client: Client): void {
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
