import { ComplianceDeadline } from "../../../../models/compliance-deadline.model";

export class ComplianceMapper {
  static toDomain(raw: any): any {
    return {
      id: raw.id,
      type: raw.type,
      title: raw.title,
      dueDate: raw.dueDate,
      recurring: raw.recurring,
      recurringPattern: raw.recurringPattern,
      description: raw.description,
      isSeeded: raw.isSeeded,
      createdAt: raw.createdAt
    };
  }
}
