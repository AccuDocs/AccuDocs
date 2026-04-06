import { injectable, inject } from "tsyringe";
import { IChecklistRepository } from "../../domain/repositories/IChecklistRepository";
import { IClientRepository } from "../../../client/domain/repositories/IClientRepository";
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class ChecklistService {
  constructor(
    @inject("IChecklistRepository") private checklistRepo: IChecklistRepository,
    @inject("IClientRepository") private clientRepo: IClientRepository
  ) {}

  async getChecklists(organizationId: string, filters: any, pagination: any) {
    return this.checklistRepo.findAll(organizationId, filters, pagination);
  }

  async getTemplates() {
    return this.checklistRepo.findTemplates();
  }

  async getStats(organizationId: string) {
    return this.checklistRepo.getStats(organizationId);
  }

  async bulkCreateChecklists(organizationId: string, userId: string, data: any) {
    const { templateId, clientIds, financialYear, dueDate, notes } = data;

    const template = await this.checklistRepo.findTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let targetClients: any[] = [];
    if (clientIds === 'all') {
      const { clients } = await this.clientRepo.findAll({ organizationId }, { page: 1, limit: 1000 });
      targetClients = clients;
    } else if (Array.isArray(clientIds)) {
      for (const id of clientIds) {
        const client = await this.clientRepo.findById(id, organizationId);
        if (client) targetClients.push(client);
      }
    }

    const checklists = await Promise.all(targetClients.map(async (client) => {
      const checklistData = {
        clientId: client.id,
        templateId: template.id,
        name: `${template.name} - ${financialYear}`,
        financialYear,
        serviceType: template.serviceType,
        items: template.items.map((item: any) => ({
          id: uuidv4(),
          label: item.label,
          description: item.description,
          category: item.category,
          required: item.required,
          status: 'pending'
        })),
        progress: 0,
        totalItems: template.items.length,
        receivedItems: 0,
        status: 'active',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        createdBy: userId
      };

      return this.checklistRepo.create(checklistData);
    }));

    return { count: checklists.length };
  }
}
