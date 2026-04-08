import { injectable, inject } from "tsyringe";
import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { CreateClientDTO, UpdateClientDTO, ClientResponseDTO } from "../dtos/ClientDtos";
import { Client, ClientProps } from "../../domain/entities/Client";
import { sequelize } from "../../../../config/database.config";
import { FolderInitializerService } from "../../../documents/application/services/FolderInitializerService";
import { ConflictError, NotFoundError } from "../../../../utils/errors";
import { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import { User } from "../../../auth/domain/entities/User";
import { logger } from "../../../../utils/logger";
import { s3Helpers } from '../../../../config/s3.config';

@injectable()
export class ClientService {
  constructor(
    @inject("IClientRepository") private clientRepository: IClientRepository,
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject(FolderInitializerService) private folderInitializer: FolderInitializerService
  ) { }

  async create(dto: CreateClientDTO, adminId: string, organizationId: string, files?: any): Promise<ClientResponseDTO> {
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

      // Handle File Uploads
      const docUrls = await this.uploadKYCDocuments(organizationId, dto.code, files);

      // 2. Create Client Profile
      const clientOrError = Client.create({
        organizationId,
        userId: user.id,
        code: dto.code,
        name: dto.name,
        gstin: dto.gstin,
        pan: dto.pan || dto.taxId,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        stateCode: dto.stateCode || '24',
        city: dto.city,
        pincode: dto.pincode,
        location: dto.location,
        creditLimit: dto.creditLimit || 0.00,
        entityType: dto.entityType || 'individual',
        businessName: dto.businessName,
        industrySector: dto.industrySector,
        incorporationDate: dto.incorporationDate,
        gstStatus: dto.gstStatus,
        financialYearEnd: dto.financialYearEnd,
        accountingMethod: dto.accountingMethod,
        estimatedTurnover: dto.estimatedTurnover,
        employeeCount: dto.employeeCount,
        identityProofUrl: docUrls.identityProofUrl || dto.identityProofUrl,
        businessRegistrationUrl: docUrls.businessRegistrationUrl || dto.businessRegistrationUrl,
        taxCardCopyUrl: docUrls.taxCardCopyUrl || dto.taxCardCopyUrl,
        previousYearReturnUrl: docUrls.previousYearReturnUrl || dto.previousYearReturnUrl,
        termsAccepted: dto.termsAccepted || false,
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
      
      const enriched = await this.enrichClient(client, user);
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
    
    const formatted = await Promise.all(clients.map(async (c) => {
      const plain = c.toJSON ? c.toJSON() : c;
      const user = plain.user || {};
      
      // Enrich with signed URLs
      const enrichedDocs = await this.getEnrichedDocUrls(plain);

      return {
        id: plain.id,
        code: plain.code,
        name: plain.name,
        isActive: plain.isActive,
        gstin: plain.gstin,
        pan: plain.pan,
        stateCode: plain.stateCode,
        mobile: plain.mobile || user.mobile,
        email: plain.email || user.email,
        address: plain.address,
        city: plain.city,
        pincode: plain.pincode,
        location: plain.location,
        creditLimit: plain.creditLimit,
        entityType: plain.entityType,
        businessName: plain.businessName,
        industrySector: plain.industrySector,
        incorporationDate: plain.incorporationDate,
        gstStatus: plain.gstStatus,
        financialYearEnd: plain.financialYearEnd,
        accountingMethod: plain.accountingMethod,
        estimatedTurnover: plain.estimatedTurnover,
        employeeCount: plain.employeeCount,
        ...enrichedDocs,
        termsAccepted: plain.termsAccepted,
        notes: plain.notes,
        metadata: plain.metadata,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          isActive: user.isActive
        },
        years: plain.years,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
      } as any;
    }));

    return { clients: formatted, total };
  }

  async getById(id: string, organizationId: string): Promise<ClientResponseDTO> {
    const client = await this.clientRepository.findById(id, organizationId);
    if (!client) throw new NotFoundError('Client not found');

    const user = await this.userRepository.findById(client.userId);
    if (!user) throw new NotFoundError('User not found');

    return await this.enrichClient(client, user);
  }

  async update(id: string, dto: UpdateClientDTO, adminId: string, organizationId: string, files?: any): Promise<ClientResponseDTO> {
    const client = await this.clientRepository.findById(id, organizationId);
    if (!client) throw new NotFoundError('Client not found');

    const user = await this.userRepository.findById(client.userId);
    if (!user) throw new NotFoundError('User not found');

    if (dto.code && dto.code !== client.code) {
      const exists = await this.clientRepository.existsByCode(dto.code, organizationId, id);
      if (exists) throw new ConflictError('Code exists');
    }

    // Handle File Uploads
    const docUrls = await this.uploadKYCDocuments(organizationId, client.code, files);

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
      pan: (dto.pan || dto.taxId) ?? client.pan,
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
      identityProofUrl: docUrls.identityProofUrl ?? dto.identityProofUrl ?? client.identityProofUrl,
      businessRegistrationUrl: docUrls.businessRegistrationUrl ?? dto.businessRegistrationUrl ?? client.businessRegistrationUrl,
      taxCardCopyUrl: docUrls.taxCardCopyUrl ?? dto.taxCardCopyUrl ?? client.taxCardCopyUrl,
      previousYearReturnUrl: docUrls.previousYearReturnUrl ?? dto.previousYearReturnUrl ?? client.previousYearReturnUrl,
      termsAccepted: dto.termsAccepted !== undefined ? dto.termsAccepted : client.termsAccepted,
      notes: dto.notes ?? client.notes,
      metadata: dto.metadata || client.metadata,
      isActive: dto.isActive !== undefined ? dto.isActive : client.isActive,
      status: 'active'
    }, client.id);

    if (updateClientOrError.isSuccess) {
      // [x] Backend: Refactor enrichClient for bulk reuse
      // [x] Backend: Update getAll in ClientService to enrich list results
      // [x] Backend: Update ClientService to handle S3 uploads and signed URLs
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

  private async uploadKYCDocuments(organizationId: string, clientCode: string, files?: any): Promise<Partial<ClientProps>> {
    const urls: Partial<ClientProps> = {};
    if (!files) return urls;

    const upload = async (field: string, targetProp: keyof ClientProps) => {
      const fileArray = files[field];
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        const extension = file.originalname.split('.').pop();
        const key = `org_${organizationId}/clients/${clientCode}/kyc/${field}_${Date.now()}.${extension}`;
        
        await s3Helpers.uploadFile(key, file.buffer, file.mimetype);
        (urls as any)[targetProp] = key;
      }
    };

    await Promise.all([
      upload('identityProofFile', 'identityProofUrl'),
      upload('businessRegistrationFile', 'businessRegistrationUrl'),
      upload('taxCardCopyFile', 'taxCardCopyUrl'),
      upload('previousYearReturnFile', 'previousYearReturnUrl')
    ]);

    return urls;
  }

  private async getEnrichedDocUrls(clientProps: any): Promise<any> {
    const getSignedUrl = async (key: string | null | undefined) => {
      if (!key) return null;
      try {
        return await s3Helpers.getSignedDownloadUrl(key);
      } catch (err) {
        logger.error(`Failed to get signed URL for ${key}: ${(err as Error).message}`);
        return null;
      }
    };

    const [
      identityProofUrl,
      businessRegistrationUrl,
      taxCardCopyUrl,
      previousYearReturnUrl
    ] = await Promise.all([
      getSignedUrl(clientProps.identityProofUrl),
      getSignedUrl(clientProps.businessRegistrationUrl),
      getSignedUrl(clientProps.taxCardCopyUrl),
      getSignedUrl(clientProps.previousYearReturnUrl)
    ]);

    return {
      identityProofUrl,
      businessRegistrationUrl,
      taxCardCopyUrl,
      previousYearReturnUrl
    };
  }

  private async enrichClient(client: Client, user: User): Promise<ClientResponseDTO> {
    const enrichedDocs = await this.getEnrichedDocUrls(client);

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
      address: client.address,
      city: client.city,
      pincode: client.pincode,
      location: client.location,
      creditLimit: client.creditLimit,
      entityType: client.entityType,
      businessName: client.businessName,
      industrySector: client.industrySector,
      incorporationDate: client.incorporationDate,
      gstStatus: client.gstStatus,
      financialYearEnd: client.financialYearEnd,
      accountingMethod: client.accountingMethod,
      estimatedTurnover: client.estimatedTurnover,
      employeeCount: client.employeeCount,
      ...enrichedDocs,
      termsAccepted: client.termsAccepted,
      notes: client.notes,
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
