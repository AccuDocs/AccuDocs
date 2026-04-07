import { Client } from "../../domain/entities/Client";
import { Client as ClientModel } from "../../../../models";

export class ClientMapper {
  public static toDomain(raw: any): Client {
    const props = {
      organizationId: raw.organizationId,
      userId: raw.userId,
      code: raw.code,
      name: raw.name,
      gstin: raw.gstin,
      pan: raw.pan,
      mobile: raw.mobile,
      email: raw.email,
      address: raw.address,
      stateCode: raw.stateCode,
      city: raw.city,
      pincode: raw.pincode,
      location: raw.location,
      creditLimit: typeof raw.creditLimit === 'string' ? parseFloat(raw.creditLimit) : raw.creditLimit,
      entityType: raw.entityType as any,
      businessName: raw.businessName,
      industrySector: raw.industrySector,
      incorporationDate: raw.incorporationDate,
      gstStatus: raw.gstStatus,
      financialYearEnd: raw.financialYearEnd,
      accountingMethod: raw.accountingMethod,
      estimatedTurnover: raw.estimatedTurnover,
      employeeCount: raw.employeeCount,
      identityProofUrl: raw.identityProofUrl,
      businessRegistrationUrl: raw.businessRegistrationUrl,
      taxCardCopyUrl: raw.taxCardCopyUrl,
      previousYearReturnUrl: raw.previousYearReturnUrl,
      termsAccepted: raw.termsAccepted,
      notes: raw.notes,
      metadata: raw.metadata,
      isActive: raw.isActive,
      status: raw.isActive ? 'active' : 'inactive' as any,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    
    const clientOrError = Client.create(props, raw.id);
    if (clientOrError.isFailure) {
      console.error(clientOrError.getError());
      return null as any;
    }
    return clientOrError.getValue();
  }

  public static toPersistence(client: Client): any {
    return {
      id: client.id,
      organizationId: client.organizationId,
      userId: client.userId,
      code: client.code,
      name: client.name,
      gstin: client.gstin,
      pan: client.pan,
      mobile: client.mobile,
      email: client.email,
      address: client.address,
      stateCode: client.stateCode,
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
      identityProofUrl: client.identityProofUrl,
      businessRegistrationUrl: client.businessRegistrationUrl,
      taxCardCopyUrl: client.taxCardCopyUrl,
      previousYearReturnUrl: client.previousYearReturnUrl,
      termsAccepted: client.termsAccepted,
      notes: client.notes,
      metadata: client.metadata,
      isActive: client.isActive
    };
  }
}
