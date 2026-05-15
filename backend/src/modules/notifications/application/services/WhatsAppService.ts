import { injectable, inject } from "tsyringe";
import { Client, User } from "../../../../models";
import { WhatsAppServiceAdapter } from "../../infrastructure/WhatsAppServiceAdapter";

interface ClientChatMatch {
  id: string;
  code: string;
  name: string;
  mobile: string | null;
  email: string | null;
  isActive: boolean;
}

@injectable()
export class WhatsAppService {
  constructor(
    @inject("WhatsAppServiceAdapter") private waAdapter: WhatsAppServiceAdapter
  ) {}

  async getQR() {
    return this.waAdapter.getQR();
  }

  async getStatus() {
    return this.waAdapter.getStatus();
  }

  async sendMessage(to: string, message: string) {
    return this.waAdapter.sendMessage(to, message);
  }

  async getSession(mobile: string) {
    return this.waAdapter.getSession(mobile);
  }

  async clearSession() {
    return this.waAdapter.clearSession();
  }

  async getChats(organizationId: string) {
    const chats = await this.waAdapter.getChats();
    return this.attachClientMatches(organizationId, chats);
  }

  async getChatMessages(chatId: string, limit = 50) {
    return this.waAdapter.getChatMessages(chatId, limit);
  }

  async logout() {
    return this.waAdapter.logout();
  }

  private async attachClientMatches(organizationId: string, chats: any[]): Promise<any[]> {
    if (!chats.length) return chats;

    const clients = await Client.findAll({
      where: { organizationId },
      attributes: ['id', 'code', 'name', 'mobile', 'email', 'isActive'],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email', 'isActive'] },
      ],
    });

    const clientByPhone = new Map<string, ClientChatMatch>();
    const clientPrimaryKeys = new Map<string, string>();
    for (const clientModel of clients as any[]) {
      const plain = clientModel.get({ plain: true });
      const match: ClientChatMatch = {
        id: plain.id,
        code: plain.code,
        name: plain.name,
        mobile: plain.mobile || plain.user?.mobile || null,
        email: plain.email || plain.user?.email || null,
        isActive: Boolean(plain.isActive && (plain.user?.isActive ?? true)),
      };

      for (const candidate of [plain.mobile, plain.user?.mobile]) {
        const keys = this.phoneKeys(candidate);
        if (keys[0] && !clientPrimaryKeys.has(match.id)) clientPrimaryKeys.set(match.id, keys[0]);
        for (const key of keys) {
          clientByPhone.set(key, match);
        }
      }
    }

    const matchedClientIds = new Set<string>();
    const enrichedChats = chats.map((chat) => {
      const match = this.phoneKeys(chat.id).map((key) => clientByPhone.get(key)).find(Boolean) || null;
      if (match) matchedClientIds.add(match.id);
      return {
        ...chat,
        isClient: Boolean(match),
        client: match,
        name: match?.name || chat.name,
      };
    });

    const missingClientChats = [...clientByPhone.values()]
      .filter((client, index, all) => all.findIndex((item) => item.id === client.id) === index)
      .filter((client) => !matchedClientIds.has(client.id))
      .map((client) => {
        const phone = clientPrimaryKeys.get(client.id) || this.phoneKeys(client.mobile)[0] || '';
        return {
          id: phone ? `${phone}@c.us` : `client:${client.id}`,
          name: client.name,
          unreadCount: 0,
          lastMessage: null,
          isClient: true,
          client,
          canStartChat: Boolean(phone),
        };
      });

    return [...enrichedChats, ...missingClientChats];
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
}
