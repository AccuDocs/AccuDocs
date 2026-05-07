import { Op } from 'sequelize';
import { InvoiceTemplate } from '../../../../models/invoice-template.model';
import { AppError } from '../../../../utils/errors';

export class InvoiceTemplateService {
  /**
   * Get all templates available to an org: system templates + org-specific templates
   */
  async getTemplates(orgId: string) {
    const templates = await InvoiceTemplate.findAll({
      where: {
        [Op.or]: [{ isSystem: true, orgId: null }, { orgId }],
      },
      attributes: ['id', 'name', 'thumbnailUrl', 'isDefault', 'orgId', 'isSystem', 'createdAt'],
      order: [
        ['isDefault', 'DESC'],
        ['isSystem', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    const orgDefault = templates.find((template) => !template.isSystem && template.orgId === orgId && template.isDefault);
    return templates.map((template) => {
      const plain = template.get({ plain: true }) as any;
      return {
        ...plain,
        isDefault: orgDefault ? plain.id === orgDefault.id : plain.isDefault,
      };
    });
  }

  /**
   * Get single template — must be system or belong to orgId
   */
  async getTemplateById(id: string, orgId: string) {
    const template = await InvoiceTemplate.findOne({
      where: {
        id,
        [Op.or]: [{ isSystem: true }, { orgId }],
      },
    });
    if (!template) throw new AppError('Template not found', 404);
    return template;
  }

  /**
   * Create a custom org-level template
   */
  async createTemplate(orgId: string, data: { name: string; htmlContent: string; thumbnailUrl?: string }) {
    const template = await InvoiceTemplate.create({
      name: data.name,
      htmlContent: data.htmlContent,
      thumbnailUrl: data.thumbnailUrl ?? null,
      isDefault: false,
      orgId,
      isSystem: false,
    } as any);
    return template;
  }

  /**
   * Set a template as org default (clears previous default)
   */
  async setDefault(orgId: string, templateId: string) {
    // Verify the template exists and is accessible
    await this.getTemplateById(templateId, orgId);

    // Clear existing org default. System templates remain immutable; org-level copies carry the active default.
    await InvoiceTemplate.update(
      { isDefault: false } as any,
      { where: { orgId, isDefault: true } }
    );

    // Set new default (org-specific override — create a copy if it's a system template)
    const tpl = await InvoiceTemplate.findByPk(templateId);
    if (!tpl) throw new AppError('Template not found', 404);

    if (tpl.isSystem) {
      const existingCopy = await InvoiceTemplate.findOne({
        where: {
          orgId,
          isSystem: false,
          name: tpl.name,
        },
      });

      if (existingCopy) {
        await existingCopy.update({
          htmlContent: tpl.htmlContent,
          thumbnailUrl: tpl.thumbnailUrl,
          isDefault: true,
        } as any);
        return existingCopy.reload();
      }

      // Create a thin org-level record flagged as default.
      const orgCopy = await InvoiceTemplate.create({
        name: tpl.name,
        htmlContent: tpl.htmlContent,
        thumbnailUrl: tpl.thumbnailUrl,
        isDefault: true,
        orgId,
        isSystem: false,
      } as any);
      return orgCopy;
    }

    await InvoiceTemplate.update({ isDefault: true } as any, { where: { id: templateId, orgId } });
    return InvoiceTemplate.findByPk(templateId);
  }

  /**
   * Hydrate an HTML template string with invoice data.
   * Returns the filled HTML ready for Puppeteer or direct serving.
   */
  buildHtml(htmlContent: string, data: Record<string, unknown>): string {
    let html = htmlContent;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, String(value ?? ''));
    }
    return html;
  }

  /**
   * Generate a PDF buffer for an invoice using a specific template.
   * Falls back to the org default, then the system default ('Modern').
   */
  async generatePdfBuffer(
    orgId: string,
    templateId: string | undefined,
    invoiceData: Record<string, unknown>
  ): Promise<Buffer> {
    let template: InvoiceTemplate | null = null;

    if (templateId) {
      template = await InvoiceTemplate.findOne({
        where: { id: templateId, [Op.or]: [{ isSystem: true }, { orgId }] },
      });
    }

    if (!template) {
      // Fall back to org default
      template = await InvoiceTemplate.findOne({ where: { orgId, isDefault: true } });
    }

    if (!template) {
      // Fall back to system default (Modern)
      template = await InvoiceTemplate.findOne({ where: { isSystem: true, isDefault: true } });
    }

    if (!template) {
      // Last resort: first system template
      template = await InvoiceTemplate.findOne({ where: { isSystem: true } });
    }

    if (!template) throw new AppError('No invoice template found', 404);

    const html = this.buildHtml(template.htmlContent, invoiceData);

    try {
      // Dynamic import so Puppeteer is optional (won't break if not installed)
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch {
      throw new AppError(
        'PDF generation failed. Ensure puppeteer is installed: npm install puppeteer',
        500
      );
    }
  }
}
