require('ts-node/register');
require('../models/index');

const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database.config');
const {
  Organization,
  User,
  Client,
  Invoice,
  InvoiceLineItem,
  ServiceTemplate,
} = require('../models');

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function shiftDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function roundTwo(value) {
  return Math.round(value * 100) / 100;
}

function calculateTotals(lineItems, gstType) {
  const subtotal = roundTwo(
    lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitRate), 0)
  );
  const cgstAmount = gstType === 'CGST_SGST' ? roundTwo(subtotal * 0.09) : 0;
  const sgstAmount = gstType === 'CGST_SGST' ? roundTwo(subtotal * 0.09) : 0;
  const igstAmount = gstType === 'IGST' ? roundTwo(subtotal * 0.18) : 0;
  const totalBeforeRounding = subtotal + cgstAmount + sgstAmount + igstAmount;
  const totalAmount = Math.round(totalBeforeRounding);
  const roundOff = roundTwo(totalAmount - totalBeforeRounding);

  return {
    subtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    roundOff,
  };
}

async function ensureBranch(organizationId, organization) {
  const [rows] = await sequelize.query(
    `
      select id
      from branches
      where organization_id = :organizationId
      order by created_at asc
      limit 1
    `,
    { replacements: { organizationId } }
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  const branchId = uuidv4();
  await sequelize.query(
    `
      insert into branches (
        id,
        organization_id,
        branch_code,
        name,
        gstin,
        address,
        phone,
        email,
        invoice_series_prefix,
        is_active,
        created_at,
        updated_at
      ) values (
        :id,
        :organizationId,
        :branchCode,
        :name,
        :gstin,
        :address,
        :phone,
        :email,
        :invoiceSeriesPrefix,
        true,
        now(),
        now()
      )
    `,
    {
      replacements: {
        id: branchId,
        organizationId,
        branchCode: 'AHM-HQ',
        name: 'Ahmedabad Head Office',
        gstin: organization.gstin,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        invoiceSeriesPrefix: 'INV-2526',
      },
    }
  );

  return branchId;
}

async function ensureClient(seed, organizationId) {
  let user = await User.findOne({
    where: {
      organizationId,
      mobile: seed.mobile,
    },
  });

  if (!user) {
    user = await User.create({
      organizationId,
      name: seed.contactName,
      mobile: seed.mobile,
      email: seed.email,
      password: null,
      role: 'client',
      isActive: true,
      preferences: {},
    });
  } else {
    await user.update({
      name: seed.contactName,
      email: seed.email,
      isActive: true,
    });
  }

  let client = await Client.findOne({
    where: {
      userId: user.id,
    },
  });

  if (!client) {
    client = await Client.create({
      organizationId,
      userId: user.id,
      code: seed.code,
      name: seed.name,
      gstin: seed.gstin,
      pan: seed.pan,
      mobile: seed.mobile,
      email: seed.email,
      address: seed.address,
      stateCode: seed.stateCode,
      city: seed.city,
      pincode: seed.pincode,
      creditLimit: seed.creditLimit,
      entityType: seed.entityType,
      notes: seed.notes,
      metadata: {
        seeded: true,
        industry: seed.industry,
      },
      isActive: true,
    });
  } else {
    await client.update({
      organizationId,
      code: seed.code,
      name: seed.name,
      gstin: seed.gstin,
      pan: seed.pan,
      mobile: seed.mobile,
      email: seed.email,
      address: seed.address,
      stateCode: seed.stateCode,
      city: seed.city,
      pincode: seed.pincode,
      creditLimit: seed.creditLimit,
      entityType: seed.entityType,
      notes: seed.notes,
      metadata: {
        ...(client.metadata || {}),
        seeded: true,
        industry: seed.industry,
      },
      isActive: true,
    });
  }

  return client;
}

async function ensureServiceTemplates() {
  await ServiceTemplate.sync();

  const templates = [
    ['ITR Filing - Salaried', '998231', 2500, 18, 1, 'Income tax return filing for salaried individuals'],
    ['ITR Filing - Business', '998231', 6500, 18, 2, 'Income tax return filing for business and proprietorship clients'],
    ['GST Return Filing', '998232', 3000, 18, 3, 'Monthly or quarterly GST return preparation and filing'],
    ['GST Annual Return', '998232', 8500, 18, 4, 'Annual GST return and reconciliation support'],
    ['TDS Return Filing', '998233', 2200, 18, 5, 'Quarterly TDS return preparation and filing'],
    ['Bookkeeping Support', '998224', 5000, 18, 6, 'Monthly bookkeeping and ledger scrutiny'],
    ['Payroll Processing', '998311', 3500, 18, 7, 'Monthly payroll processing with compliance support'],
    ['Tax Consultation', '998231', 4000, 18, 8, 'Tax planning and advisory consultation'],
    ['Audit Support', '998221', 15000, 18, 9, 'Statutory audit support and finalization'],
    ['ROC Filing', '998214', 4500, 18, 10, 'Annual ROC forms and secretarial compliance'],
    ['Company Incorporation', '998213', 12000, 18, 11, 'Private limited or LLP incorporation package'],
    ['Certification Work', '998299', 5000, 18, 12, 'Certification and attestation assignments'],
  ];

  for (const [name, sacCode, defaultRate, defaultGstRate, sortOrder, description] of templates) {
    const [template, created] = await ServiceTemplate.findOrCreate({
      where: {
        name,
        organizationId: null,
      },
      defaults: {
        description,
        sacCode,
        defaultRate,
        defaultGstRate,
        isSystem: true,
        isActive: true,
        sortOrder,
      },
    });

    if (!created) {
      await template.update({
        description,
        sacCode,
        defaultRate,
        defaultGstRate,
        isSystem: true,
        isActive: true,
        sortOrder,
      });
    }
  }
}

async function createSeedInvoices({
  organizationId,
  adminUserId,
  firmGstin,
  clients,
}) {
  const today = new Date();
  const invoiceSeeds = [
    {
      invoiceNumber: 'INV-2526-001',
      client: clients.rajesh,
      invoiceDate: shiftDays(today, -35),
      dueDate: shiftDays(today, -5),
      status: 'overdue',
      notes: 'Seeded demo: GST returns for January and February.',
      lineItems: [
        { description: 'GST Return Filing - Jan 2026', sacCode: '998232', quantity: 1, unitRate: 3000 },
        { description: 'GST Return Filing - Feb 2026', sacCode: '998232', quantity: 1, unitRate: 3000 },
      ],
      whatsappSentAt: shiftDays(today, -34).toISOString(),
      pdfGeneratedAt: shiftDays(today, -35).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-001.pdf',
    },
    {
      invoiceNumber: 'INV-2526-002',
      client: clients.vinay,
      invoiceDate: shiftDays(today, -30),
      dueDate: shiftDays(today, 0),
      status: 'issued',
      notes: 'Seeded demo: ITR and tax planning retainer.',
      lineItems: [
        { description: 'ITR Filing - Business', sacCode: '998231', quantity: 1, unitRate: 6500 },
        { description: 'Tax Consultation', sacCode: '998231', quantity: 1, unitRate: 4000 },
      ],
      issuedAt: shiftDays(today, -29).toISOString(),
      whatsappSentAt: shiftDays(today, -29).toISOString(),
      pdfGeneratedAt: shiftDays(today, -30).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-002.pdf',
    },
    {
      invoiceNumber: 'INV-2526-003',
      client: clients.nakoda,
      invoiceDate: shiftDays(today, -24),
      dueDate: shiftDays(today, 6),
      status: 'partially_paid',
      notes: 'Seeded demo: Monthly bookkeeping and payroll support.',
      lineItems: [
        { description: 'Bookkeeping Support - Feb 2026', sacCode: '998224', quantity: 1, unitRate: 5000 },
        { description: 'Payroll Processing - Feb 2026', sacCode: '998311', quantity: 1, unitRate: 3500 },
      ],
      issuedAt: shiftDays(today, -23).toISOString(),
      amountPaid: 5000,
      payments: [
        {
          amount: 5000,
          paymentDate: dateOnly(shiftDays(today, -18)),
          paymentMethod: 'upi',
          referenceNumber: 'UTR520018776',
          notes: 'Advance received against monthly retainer',
        },
      ],
      pdfGeneratedAt: shiftDays(today, -24).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-003.pdf',
    },
    {
      invoiceNumber: 'INV-2526-004',
      client: clients.patelSiddharth,
      invoiceDate: shiftDays(today, -20),
      dueDate: shiftDays(today, 10),
      status: 'draft',
      notes: 'Seeded demo: Draft invoice for ROC annual compliance.',
      lineItems: [
        { description: 'ROC Filing - Annual Forms', sacCode: '998214', quantity: 1, unitRate: 4500 },
      ],
    },
    {
      invoiceNumber: 'INV-2526-005',
      client: clients.bluePeak,
      invoiceDate: shiftDays(today, -16),
      dueDate: shiftDays(today, -1),
      status: 'paid',
      notes: 'Seeded demo: Company incorporation package completed.',
      lineItems: [
        { description: 'Company Incorporation', sacCode: '998213', quantity: 1, unitRate: 12000 },
        { description: 'Certification Work', sacCode: '998299', quantity: 1, unitRate: 5000 },
      ],
      issuedAt: shiftDays(today, -15).toISOString(),
      paidAt: shiftDays(today, -9).toISOString(),
      amountPaid: null,
      payments: [
        {
          amount: null,
          paymentDate: dateOnly(shiftDays(today, -9)),
          paymentMethod: 'bank_transfer',
          referenceNumber: 'HDFC9033471201',
          notes: 'Full settlement received in one transfer',
        },
      ],
      whatsappSentAt: shiftDays(today, -15).toISOString(),
      pdfGeneratedAt: shiftDays(today, -16).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-005.pdf',
    },
    {
      invoiceNumber: 'INV-2526-006',
      client: clients.vinay,
      invoiceDate: shiftDays(today, -14),
      dueDate: shiftDays(today, 14),
      status: 'cancelled',
      notes: 'Seeded demo: Superseded by revised scope and cancelled.',
      cancelReason: 'Superseded by revised scope before issue.',
      lineItems: [
        { description: 'Audit Support - Initial Scope', sacCode: '998221', quantity: 1, unitRate: 9000 },
      ],
      cancelledAt: shiftDays(today, -13).toISOString(),
    },
    {
      invoiceNumber: 'INV-2526-007',
      client: clients.rajesh,
      invoiceDate: shiftDays(today, -8),
      dueDate: shiftDays(today, 22),
      status: 'issued',
      notes: 'Seeded demo: GST annual return and reconciliation.',
      lineItems: [
        { description: 'GST Annual Return', sacCode: '998232', quantity: 1, unitRate: 8500 },
      ],
      issuedAt: shiftDays(today, -7).toISOString(),
      whatsappSentAt: shiftDays(today, -7).toISOString(),
      pdfGeneratedAt: shiftDays(today, -8).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-007.pdf',
    },
    {
      invoiceNumber: 'INV-2526-008',
      client: clients.nakoda,
      invoiceDate: shiftDays(today, -3),
      dueDate: shiftDays(today, 27),
      status: 'paid',
      notes: 'Seeded demo: Quarterly TDS filing closed and collected.',
      lineItems: [
        { description: 'TDS Return Filing - Q4', sacCode: '998233', quantity: 1, unitRate: 2200 },
      ],
      issuedAt: shiftDays(today, -2).toISOString(),
      paidAt: shiftDays(today, -1).toISOString(),
      amountPaid: null,
      payments: [
        {
          amount: null,
          paymentDate: dateOnly(shiftDays(today, -1)),
          paymentMethod: 'neft',
          referenceNumber: 'NEFT44320018',
          notes: 'Collected on the same day as filing completion',
        },
      ],
      pdfGeneratedAt: shiftDays(today, -3).toISOString(),
      pdfS3Key: 'invoices/demo/INV-2526-008.pdf',
    },
  ];

  const seedNumbers = invoiceSeeds.map((seed) => seed.invoiceNumber);
  const existingInvoices = await Invoice.findAll({
    where: {
      organizationId,
      invoiceNumber: {
        [Op.in]: seedNumbers,
      },
    },
  });

  if (existingInvoices.length > 0) {
    const invoiceIds = existingInvoices.map((invoice) => invoice.id);
    await sequelize.query(`delete from payments where invoice_id in (:invoiceIds)`, {
      replacements: { invoiceIds },
    });
    await InvoiceLineItem.destroy({
      where: {
        invoiceId: {
          [Op.in]: invoiceIds,
        },
      },
      force: true,
    });
    await Invoice.destroy({
      where: {
        id: {
          [Op.in]: invoiceIds,
        },
      },
      force: true,
    });
  }

  for (const seed of invoiceSeeds) {
    const gstType = seed.client.stateCode === '24' ? 'CGST_SGST' : 'IGST';
    const totals = calculateTotals(seed.lineItems, gstType);
    const totalAmount = totals.totalAmount;
    const amountPaid = seed.amountPaid == null
      ? (seed.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
      : seed.amountPaid;
    const resolvedAmountPaid =
      seed.status === 'paid' && amountPaid === 0 ? totalAmount : amountPaid;

    const invoice = await Invoice.create({
      id: uuidv4(),
      organizationId,
      clientId: seed.client.id,
      recurringTemplateId: null,
      invoiceNumber: seed.invoiceNumber,
      status: seed.status,
      invoiceDate: dateOnly(seed.invoiceDate),
      dueDate: dateOnly(seed.dueDate),
      issuedAt: seed.issuedAt || null,
      paidAt: seed.paidAt || null,
      cancelledAt: seed.cancelledAt || null,
      gstType,
      placeOfSupply: seed.client.stateCode,
      clientGstin: seed.client.gstin || null,
      firmGstin,
      subtotal: totals.subtotal,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      roundOff: totals.roundOff,
      totalAmount,
      amountPaid: resolvedAmountPaid,
      balanceDue: Math.max(totalAmount - resolvedAmountPaid, 0),
      notes: seed.notes,
      cancelReason: seed.cancelReason || null,
      internalNotes: 'Seeded demo billing data',
      pdfS3Key: seed.pdfS3Key || null,
      pdfGeneratedAt: seed.pdfGeneratedAt || null,
      whatsappSentAt: seed.whatsappSentAt || null,
      whatsappSentBy: seed.whatsappSentAt ? adminUserId : null,
      emailSentAt: null,
      createdBy: adminUserId,
      issuedBy: seed.issuedAt ? adminUserId : null,
      cancelledBy: seed.cancelledAt ? adminUserId : null,
    });

    for (let index = 0; index < seed.lineItems.length; index += 1) {
      const item = seed.lineItems[index];
      await InvoiceLineItem.create({
        id: uuidv4(),
        invoiceId: invoice.id,
        serviceTemplateId: null,
        description: item.description,
        sacCode: item.sacCode,
        quantity: item.quantity,
        unitRate: item.unitRate,
        amount: roundTwo(item.quantity * item.unitRate),
        sortOrder: index,
      });
    }

    for (const payment of seed.payments || []) {
      const paymentAmount = payment.amount == null ? totalAmount : payment.amount;
      await sequelize.query(
        `
          insert into payments (
            id,
            organization_id,
            client_id,
            invoice_id,
            payment_type,
            amount,
            payment_date,
            received_date,
            payment_mode,
            reference_number,
            notes,
            recorded_by,
            is_reversed,
            created_at,
            updated_at
          ) values (
            :id,
            :organizationId,
            :clientId,
            :invoiceId,
            'invoice_payment',
            :amount,
            :paymentDate,
            now(),
            :paymentMode,
            :referenceNumber,
            :notes,
            :recordedBy,
            false,
            now(),
            now()
          )
        `,
        {
          replacements: {
            id: uuidv4(),
            organizationId,
            clientId: seed.client.id,
            invoiceId: invoice.id,
            amount: paymentAmount,
            paymentDate: payment.paymentDate,
            paymentMode: payment.paymentMethod,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
            recordedBy: adminUserId,
          },
        }
      );
    }
  }
}

async function seedRecurringTemplates({ organizationId, branchId, clients }) {
  const templateNames = [
    'Monthly GST Compliance Retainer',
    'Quarterly TDS Filing Cycle',
    'Annual ROC Compliance',
  ];

  await sequelize.query(
    `delete from recurring_invoice_templates where organization_id = :organizationId and template_name in (:templateNames)`,
    {
      replacements: {
        organizationId,
        templateNames,
      },
    }
  );

  const templates = [
    {
      client: clients.rajesh,
      templateName: 'Monthly GST Compliance Retainer',
      serviceCategory: 'gst',
      recurringFrequency: 'MONTHLY',
      startDate: dateOnly(shiftDays(new Date(), -45)),
      nextInvoiceDate: dateOnly(shiftDays(new Date(), 5)),
      subtotal: 3000,
      gstSlab: 18,
      dueDateOffset: 15,
      autoIssue: true,
      isActive: true,
    },
    {
      client: clients.nakoda,
      templateName: 'Quarterly TDS Filing Cycle',
      serviceCategory: 'tds',
      recurringFrequency: 'QUARTERLY',
      startDate: dateOnly(shiftDays(new Date(), -75)),
      nextInvoiceDate: dateOnly(shiftDays(new Date(), 12)),
      subtotal: 2200,
      gstSlab: 18,
      dueDateOffset: 20,
      autoIssue: false,
      isActive: true,
    },
    {
      client: clients.bluePeak,
      templateName: 'Annual ROC Compliance',
      serviceCategory: 'roc',
      recurringFrequency: 'YEARLY',
      startDate: dateOnly(shiftDays(new Date(), -120)),
      nextInvoiceDate: dateOnly(shiftDays(new Date(), 30)),
      subtotal: 4500,
      gstSlab: 18,
      dueDateOffset: 30,
      autoIssue: false,
      isActive: false,
    },
  ];

  for (const template of templates) {
    await sequelize.query(
      `
        insert into recurring_invoice_templates (
          id,
          organization_id,
          client_id,
          branch_id,
          template_name,
          service_category,
          recurring_frequency,
          start_date,
          end_date,
          subtotal,
          gst_slab,
          due_date_offset,
          auto_issue,
          is_active,
          next_invoice_date,
          created_at,
          updated_at
        ) values (
          :id,
          :organizationId,
          :clientId,
          :branchId,
          :templateName,
          :serviceCategory,
          :recurringFrequency,
          :startDate,
          null,
          :subtotal,
          :gstSlab,
          :dueDateOffset,
          :autoIssue,
          :isActive,
          :nextInvoiceDate,
          now(),
          now()
        )
      `,
      {
        replacements: {
          id: uuidv4(),
          organizationId,
          clientId: template.client.id,
          branchId,
          templateName: template.templateName,
          serviceCategory: template.serviceCategory,
          recurringFrequency: template.recurringFrequency,
          startDate: template.startDate,
          subtotal: template.subtotal,
          gstSlab: template.gstSlab,
          dueDateOffset: template.dueDateOffset,
          autoIssue: template.autoIssue,
          isActive: template.isActive,
          nextInvoiceDate: template.nextInvoiceDate,
        },
      }
    );
  }
}

async function main() {
  await sequelize.authenticate();

  const adminUser = await User.findOne({
    where: {
      role: 'admin',
    },
    order: [['createdAt', 'ASC']],
  });

  if (!adminUser) {
    throw new Error('No admin user found to seed billing demo data.');
  }

  const organization = await Organization.findByPk(adminUser.organizationId);
  if (!organization) {
    throw new Error('Admin organization not found.');
  }

  await organization.update({
    name: 'Shah & Associates',
    slug: organization.slug || 'shah-and-associates',
    gstin: '24AABCS9999A1Z3',
    pan: 'AABCS9999A',
    address: 'A-201, Shyamal Cross Roads, Satellite, Ahmedabad - 380015',
    phone: '+91 79 4000 1515',
    email: 'accounts@shahandassociates.in',
    stateCode: '24',
    bankName: 'HDFC Bank',
    bankAccountNumber: '50200011892011',
    bankIfsc: 'HDFC0001234',
    bankBranch: 'Satellite Branch',
    subscriptionPlan: 'enterprise',
    settings: {
      ...(organization.settings || {}),
      billingSeededAt: new Date().toISOString(),
    },
  });

  const branchId = await ensureBranch(organization.id, organization);

  const clientSeeds = [
    {
      key: 'patelSiddharth',
      code: '01',
      name: 'Patel Siddharth',
      contactName: 'Patel Siddharth',
      mobile: '+918849083015',
      email: 'siddharth.patel@pateltraders.in',
      gstin: '24AALPP5400N1Z7',
      pan: 'AALPP5400N',
      address: '15, Dev Arc Mall, SG Highway, Ahmedabad',
      city: 'Ahmedabad',
      pincode: '380015',
      stateCode: '24',
      creditLimit: 75000,
      entityType: 'proprietorship',
      industry: 'Retail trading',
      notes: 'Retail client with monthly GST follow-ups.',
    },
    {
      key: 'vinay',
      code: '02',
      name: 'Vinay Patel',
      contactName: 'Vinay Patel',
      mobile: '+919925010233',
      email: 'vinay@vpenterprise.in',
      gstin: null,
      pan: 'AALPV9002K',
      address: 'B-12, Satyam Business Hub, Science City Road, Ahmedabad',
      city: 'Ahmedabad',
      pincode: '380060',
      stateCode: '24',
      creditLimit: 60000,
      entityType: 'individual',
      industry: 'Consulting',
      notes: 'Direct tax and advisory client.',
    },
    {
      key: 'rajesh',
      code: '06',
      name: 'Rajesh Traders',
      contactName: 'Rajesh Kumar',
      mobile: '+919876540011',
      email: 'accounts@rajeshtraders.in',
      gstin: '24AADCR9876A1Z2',
      pan: 'AADCR9876A',
      address: '41, Narol Industrial Estate, Narol, Ahmedabad',
      city: 'Ahmedabad',
      pincode: '382405',
      stateCode: '24',
      creditLimit: 150000,
      entityType: 'partnership',
      industry: 'Wholesale trading',
      notes: 'High-volume GST compliance client.',
    },
    {
      key: 'nakoda',
      code: '07',
      name: 'Nakoda Tech LLP',
      contactName: 'Kunal Shah',
      mobile: '+919998000144',
      email: 'finance@nakodatech.in',
      gstin: '27AAKFN4512P1ZC',
      pan: 'AAKFN4512P',
      address: '602, One World Center, Lower Parel, Mumbai',
      city: 'Mumbai',
      pincode: '400013',
      stateCode: '27',
      creditLimit: 240000,
      entityType: 'llp',
      industry: 'Software services',
      notes: 'Inter-state retainer for accounts and payroll.',
    },
    {
      key: 'bluePeak',
      code: '08',
      name: 'BluePeak Private Limited',
      contactName: 'Megha Doshi',
      mobile: '+918866001122',
      email: 'admin@bluepeak.in',
      gstin: '29AACCB1122D1ZE',
      pan: 'AACCB1122D',
      address: '24, Richmond Road, Bengaluru',
      city: 'Bengaluru',
      pincode: '560025',
      stateCode: '29',
      creditLimit: 300000,
      entityType: 'pvt_ltd',
      industry: 'Technology products',
      notes: 'Outstation corporate entity with annual ROC and advisory work.',
    },
  ];

  const clientMap = {};
  for (const seed of clientSeeds) {
    clientMap[seed.key] = await ensureClient(seed, organization.id);
  }

  await ensureServiceTemplates();
  await createSeedInvoices({
    organizationId: organization.id,
    adminUserId: adminUser.id,
    firmGstin: organization.gstin,
    clients: clientMap,
  });
  await seedRecurringTemplates({
    organizationId: organization.id,
    branchId,
    clients: clientMap,
  });

  const [summary] = await sequelize.query(
    `
      select
        (select count(*) from clients where organization_id = :organizationId and deleted_at is null) as clients,
        (select count(*) from invoices where organization_id = :organizationId and deleted_at is null) as invoices,
        (select count(*) from invoice_line_items ili
          join invoices i on i.id = ili.invoice_id
         where i.organization_id = :organizationId and i.deleted_at is null) as line_items,
        (select count(*) from payments where organization_id = :organizationId) as payments,
        (select count(*) from recurring_invoice_templates where organization_id = :organizationId and deleted_at is null) as recurring_templates
    `,
    { replacements: { organizationId: organization.id } }
  );

  console.log('Billing demo data seeded successfully.');
  console.log(JSON.stringify(summary[0], null, 2));
  await sequelize.close();
}

main().catch(async (error) => {
  console.error('Failed to seed billing demo data:', error);
  try {
    await sequelize.close();
  } catch (closeError) {
    console.error('Failed to close database connection:', closeError);
  }
  process.exit(1);
});
