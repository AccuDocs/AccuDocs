import { injectable, inject } from "tsyringe";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { CreateClientDTO, UpdateClientDTO, ClientResponseDTO } from "../dtos/ClientDtos";
import { Client } from "../../domain/entities/Client";
import { sequelize } from "../../../../config/database.config";
import { FolderInitializerService } from "../../../documents/application/services/FolderInitializerService";
import { ConflictError, NotFoundError } from "../../../../utils/errors";
import { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import { User } from "../../../auth/domain/entities/User";
import { logger } from "../../../../utils/logger";

@injectable()
export class ClientService {
  constructor(
    @inject("IClientRepository") private clientRepository: IClientRepository,
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject(FolderInitializerService) private folderInitializer: FolderInitializerService
  ) { }

  async create(dto: CreateClientDTO, adminId: string, organizationId: string): Promise<ClientResponseDTO> {
    const exists = await this.clientRepository.existsByCode(dto.code, organizationId);
    if (exists) {
      throw new ConflictError('Client code already exists in this organization');
    }

    const t = await sequelize.transaction();

    try {
      // 1. Resolve User for Client Login
      let user: User;
      const existingUser = await this.userRepository.findByMobileAndOrg(dto.mobile || '', organizationId);
      
      if (existingUser) {
        // Update existing user with new name and ensure it's active
        const userOrError = User.create({
          organizationId,
          name: dto.name,
          mobile: existingUser.mobile,
          role: 'client',
          isActive: true,
          lastLoginAt: existingUser.lastLoginAt,
          password: existingUser.password,
          email: dto.email || existingUser.email,
          avatarS3Key: existingUser.avatarS3Key,
          preferences: existingUser.preferences
        }, existingUser.id);
        
        if (userOrError.isFailure) throw new Error(userOrError.getError() as string);
        user = userOrError.getValue();
      } else {
        // Create New User
        const userOrError = User.create({
          organizationId,
          name: dto.name,
          mobile: dto.mobile || '',
          role: 'client',
          isActive: true,
          lastLoginAt: null,
          email: dto.email
        });
        
        if (userOrError.isFailure) throw new Error(userOrError.getError() as string);
        user = userOrError.getValue();
      }

      user = await this.userRepository.save(user, { transaction: t });

      // 2. Create Client Profile
      const clientOrError = Client.create({
        organizationId,
        userId: user.id,
        code: dto.code,
        name: dto.name,
        gstin: dto.gstin,
        pan: dto.pan,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        stateCode: dto.stateCode || '24',
        city: dto.city,
        pincode: dto.pincode,
        creditLimit: dto.creditLimit || 0.00,
        entityType: dto.entityType || 'individual',
        notes: dto.notes,
        metadata: {},
        isActive: true,
        status: 'active'
      });
      if (clientOrError.isFailure) throw new Error(clientOrError.getError() as string);
      
      const client = clientOrError.getValue();
      await this.clientRepository.save(client, { transaction: t });

      await t.commit();

      // 3. Initialize Folders (Background)
      setImmediate(() => {
        this.folderInitializer.initializeClientWorkspace(organizationId, client.id, client.code)
          .catch(err => logger.error(`Background folder init failed for ${client.code}: ${err.message}`));
      });

      logger.info(`Client created: ${client.code} in Org ${organizationId}`);
      
      const enriched = this.enrichClient(client, user);
      if (!enriched.mobile) {
        enriched.mobile = user.mobile;
      }
      return enriched;

    } catch (err) {
      await t.rollback();
      logger.error(`Failed to create client: ${(err as Error).message}`);
      throw err;
    }
  }

  async getAll(organizationId: string, filters: any, pagination: any): Promise<{ clients: ClientResponseDTO[], total: number }> {
    // Inject organizationId into filters explicitly
    const searchFilter = { ...filters, organizationId };
    
    const { clients, total } = await this.clientRepository.findAll(searchFilter, pagination);
    const formatted = clients.map(c => {
      const plain = c.toJSON ? c.toJSON() : c;
      return {
        id: plain.id,
        code: plain.code,
        name: plain.name,
        isActive: plain.isActive,
        gstin: plain.gstin,
        pan: plain.pan,
        stateCode: plain.stateCode,
        metadata: plain.metadata,
        user: plain.user,
        years: plain.years,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
      };
    });
    return { clients: formatted, total };
  }

  async getById(id: string, organizationId: string): Promise<ClientResponseDTO> {
    const client = await this.clientRepository.findById(id, organizationId);
    if (!client) throw new NotFoundError('Client not found');

    const user = await this.userRepository.findById(client.userId);
    if (!user) throw new NotFoundError('User not found');

    return this.enrichClient(client, user);
  }

  async update(id: string, dto: UpdateClientDTO, adminId: string, organizationId: string): Promise<ClientResponseDTO> {
    const client = await this.clientRepository.findById(id, organizationId);
    if (!client) throw new NotFoundError('Client not found');

    const user = await this.userRepository.findById(client.userId);
    if (!user) throw new NotFoundError('User not found');

    if (dto.code && dto.code !== client.code) {
      const exists = await this.clientRepository.existsByCode(dto.code, organizationId, id);
      if (exists) throw new ConflictError('Code exists');
    }

    // Update User
    if (dto.name || dto.mobile || dto.email || (dto.isActive !== undefined)) {
      const updateUserOrError = User.create({
        organizationId: user.organizationId,
        name: dto.name || user.name,
        mobile: dto.mobile || user.mobile,
        role: user.role as any,
        isActive: dto.isActive !== undefined ? dto.isActive : user.isActive,
        lastLoginAt: user.lastLoginAt,
        password: user.password,
        email: dto.email || user.email,
        avatarS3Key: user.avatarS3Key,
        preferences: user.preferences
      }, user.id);

      if (updateUserOrError.isSuccess) {
        await this.userRepository.save(updateUserOrError.getValue());
      }
    }

    // Update Client
    const updateClientOrError = Client.create({
      organizationId: client.organizationId,
      userId: client.userId,
      code: dto.code || client.code,
      name: dto.name || client.name,
      gstin: dto.gstin ?? client.gstin,
      pan: dto.pan ?? client.pan,
      mobile: dto.mobile ?? client.mobile,
      email: dto.email ?? client.email,
      address: dto.address ?? client.address,
      stateCode: dto.stateCode || client.stateCode,
      city: dto.city ?? client.city,
      pincode: dto.pincode ?? client.pincode,
      location: dto.location ?? client.location,
      creditLimit: dto.creditLimit ?? client.creditLimit,
      entityType: dto.entityType || client.entityType,
      businessName: dto.businessName ?? client.businessName,
      industrySector: dto.industrySector ?? client.industrySector,
      incorporationDate: dto.incorporationDate ?? client.incorporationDate,
      gstStatus: dto.gstStatus ?? client.gstStatus,
      financialYearEnd: dto.financialYearEnd ?? client.financialYearEnd,
      accountingMethod: dto.accountingMethod ?? client.accountingMethod,
      estimatedTurnover: dto.estimatedTurnover ?? client.estimatedTurnover,
      employeeCount: dto.employeeCount ?? client.employeeCount,
      termsAccepted: dto.termsAccepted !== undefined ? dto.termsAccepted : client.termsAccepted,
      notes: dto.notes ?? client.notes,
      metadata: dto.metadata || client.metadata,
      isActive: dto.isActive !== undefined ? dto.isActive : client.isActive,
      status: 'active'
    }, client.id);

    if (updateClientOrError.isSuccess) {
      await this.clientRepository.save(updateClientOrError.getValue());
    }

    const updatedClient = await this.clientRepository.findById(id, organizationId);
    const updatedUser = await this.userRepository.findById(client.userId);

    return this.enrichClient(updatedClient!, updatedUser!);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const client = await this.clientRepository.findById(id, organizationId);
    if (!client) throw new NotFoundError('Client not found');
    await this.clientRepository.delete(id, organizationId);
  }

  async getNextCode(organizationId: string): Promise<string> {
    return this.clientRepository.getNextCode(organizationId);
  }

  private enrichClient(client: Client, user: User): ClientResponseDTO {
    return {
      id: client.id,
      code: client.code,
      name: client.name,
      isActive: client.isActive,
      metadata: client.metadata,
      gstin: client.gstin,
      pan: client.pan,
      stateCode: client.stateCode,
      mobile: client.mobile,
      email: client.email,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        isActive: user.isActive
      },
      years: []
    };
  }
}
