import { HsnSac } from '../models/hsn-sac.model';

async function seed() {
  try {
    const codes = [
      { code: '8471', description: 'Automatic data processing machines (Computers/Laptops)', gstRate: 18.00, type: 'HSN', chapter: '84' },
      { code: '8517', description: 'Smartphones and other wireless telephones', gstRate: 18.00, type: 'HSN', chapter: '85' },
      { code: '9983', description: 'Other professional, technical and business services (Consulting)', gstRate: 18.00, type: 'SAC', chapter: '99' },
      { code: '9987', description: 'Maintenance and repair services', gstRate: 18.00, type: 'SAC', chapter: '99' },
      { code: '3004', description: 'Medicaments (Drugs/Medicine)', gstRate: 12.00, type: 'HSN', chapter: '30' },
      { code: '2202', description: 'Soft Drinks and Aerated Waters', gstRate: 28.00, type: 'HSN', chapter: '22' },
      { code: '4820', description: 'Notebooks and Registers', gstRate: 12.00, type: 'HSN', chapter: '48' },
      { code: '9982', description: 'Legal and accounting services', gstRate: 18.00, type: 'SAC', chapter: '99' }
    ];

    for (const code of codes) {
      await HsnSac.findOrCreate({
        where: { code: code.code, type: code.type },
        defaults: code as any
      });
    }
    console.log('HSN/SAC Seeds planted successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
