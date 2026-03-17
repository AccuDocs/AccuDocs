import { Checklist as ChecklistModel } from "../../../../models/checklist.model";
import { ChecklistTemplate as ChecklistTemplateModel } from "../../../../models/checklist-template.model";

export class ChecklistMapper {
  static toDomain(raw: any): any {
    return raw.toJSON(); // Simplified for now
  }
  
  static templateToDomain(raw: any): any {
    return raw.toJSON();
  }
}
