import { 
  Document, Task, AuditLog, Client, User, Invoice, Organization, Year
} from '../models';

async function inspectModels() {
  const models: Array<any> = [Document, Task, AuditLog, Client, User, Invoice, Organization, Year];
  
  for (const model of models) {
    console.log(`\nModel: ${model.name}`);
    const attrs = model.getAttributes();
    for (const [key, attr] of Object.entries(attrs)) {
      console.log(`  - ${key}: field=${(attr as any).field}, underscored=${(attr as any).underscored}`);
    }
  }
  process.exit(0);
}

inspectModels();
