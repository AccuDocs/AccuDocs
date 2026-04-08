import { Request, Response } from 'express';
import { GstCalculationService } from '../../application/services/gst-calculation.service';
import { GstReturn } from '../../../../models/gst-return.model';
import { container } from 'tsyringe';

export class GstController {
  private gstService: GstCalculationService;

  constructor() {
    this.gstService = container.resolve(GstCalculationService);
  }
  
  /**
   * Generates and drafts a GST Return automatically from Sales/Purchases
   */
  async draftReturn(req: Request, res: Response) {
    try {
      const clientId = req.params.clientId || req.body.clientId; 
      const organizationId = (req as any).user?.organizationId || req.body.organizationId;
      
      const { returnType, periodMonth, periodYear, financialYear, saveToWorkspace } = req.body;
      
      if (!clientId || !organizationId || !returnType || !periodMonth || !periodYear || !financialYear) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters.' });
      }

      const gstReturn = await this.gstService.upsertDraftReturn(
        clientId, 
        organizationId, 
        returnType, 
        periodMonth, 
        periodYear, 
        financialYear
      );

      // Save to workspace if requested
      if (saveToWorkspace) {
        try {
          await this.gstService.saveReturnToWorkspace(gstReturn.id, organizationId);
        } catch (wsError) {
          console.error('Failed to save GST return to workspace:', wsError);
          // Don't fail the whole request, but maybe add a warning to response
        }
      }

      return res.status(200).json({ status: 'success', data: gstReturn });
    } catch (error: any) {
      console.error('Error in draftReturn:', error);
      return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
  }

  /**
   * Fetches all GST Returns for a client
   */
  async getReturns(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const returns = await GstReturn.findAll({
        where: { clientId },
        order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
      });
      return res.status(200).json({ status: 'success', data: returns });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: 'Failed to fetch GST returns.' });
    }
  }

  /**
   * Get specific GST return by ID
   */
  async getReturnById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const gstReturn = await GstReturn.findByPk(id);
      
      if (!gstReturn) {
        return res.status(404).json({ status: 'error', message: 'GST Return not found.' });
      }

      return res.status(200).json({ status: 'success', data: gstReturn });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: 'Failed to fetch return.' });
    }
  }

  /**
   * Updates specific JSON data (e.g. manual adjustments)
   */
  async updateReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { jsonData, status, pdfUrl } = req.body;

      const gstReturn = await GstReturn.findByPk(id);
      
      if (!gstReturn) {
        return res.status(404).json({ status: 'error', message: 'GST Return not found.' });
      }

      if (gstReturn.status === 'filed') {
        return res.status(403).json({ status: 'error', message: 'Cannot edit a filed return.' });
      }

      if (jsonData) gstReturn.jsonData = jsonData;
      if (status) gstReturn.status = status;
      if (pdfUrl) gstReturn.pdfUrl = pdfUrl;

      await gstReturn.save();

      return res.status(200).json({ status: 'success', data: gstReturn, message: 'Updated correctly' });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: 'Failed to update return.' });
    }
  }

  /**
   * Exports the JSON for Portal Upload
   */
  async exportJson(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const gstReturn = await GstReturn.findByPk(id);
      
      if (!gstReturn) {
        return res.status(404).json({ status: 'error', message: 'GST Return not found.' });
      }

      // Add actual GSTIN from org/client settings
      // Here just return what's pre-calculated in DB
      return res.status(200).json(gstReturn.jsonData);
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: 'Failed to export JSON.' });
    }
  }

  /**
   * Manually trigger saving an existing return to the workspace
   */
  async saveToWorkspace(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      
      if (!id || !organizationId) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters.' });
      }

      const result = await this.gstService.saveReturnToWorkspace(id, organizationId);
      
      if (!result) {
        return res.status(404).json({ status: 'error', message: 'Could not resolve workspace folder for this return.' });
      }

      return res.status(200).json({ status: 'success', data: result, message: 'Saved to workspace successfully.' });
    } catch (error: any) {
      console.error('Error saving to workspace:', error);
      return res.status(500).json({ status: 'error', message: error.message || 'Failed to save to workspace.' });
    }
  }

  /**
   * Delete a Draft
   */
  async deleteReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const gstReturn = await GstReturn.findByPk(id);
      
      if (!gstReturn) {
        return res.status(404).json({ status: 'error', message: 'GST Return not found.' });
      }

      if (gstReturn.status === 'filed') {
        return res.status(403).json({ status: 'error', message: 'Cannot delete a filed return.' });
      }

      await gstReturn.destroy();
      return res.status(200).json({ status: 'success', message: 'Deleted successfully.' });
    } catch (error: any) {
      return res.status(500).json({ status: 'error', message: 'Failed to delete return.' });
    }
  }
}
