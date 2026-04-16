import axios from 'axios';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

export class SandboxService {
  private readonly baseUrl = 'https://api.sandbox.co.in';
  private readonly apiKey = process.env.SANDBOX_API_KEY;
  private readonly apiSecret = process.env.SANDBOX_API_SECRET;

  /**
   * Generates a request token (Auth) from Sandbox.
   * Note: In a real production scenario, you would cache this token until it expires.
   */
  private async getAuthToken(): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new AppError('Sandbox API credentials missing in environment variables', 500);
    }

    try {
      const response = await axios.post(`${this.baseUrl}/authenticate`, null, {
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': '1.0'
        }
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }
      throw new Error('Could not retrieve access token from Sandbox');
    } catch (error: any) {
      logger.error('[Sandbox] Auth failed:', error.response?.data || error.message);
      throw new AppError('Sandbox authentication failed', 502);
    }
  }

  /**
   * Fetches HSN/SAC details from official GST records via Sandbox.
   */
  async getHsnDetails(hsnCode: string) {
    const token = await this.getAuthToken();

    try {
      const response = await axios.get(`${this.baseUrl}/gst/compliance/e-way-bill/tax-payer/hsn`, {
        params: { 'hsn-code': hsnCode },
        headers: {
          'Authorization': token,
          'x-api-key': this.apiKey,
          'x-api-version': '1.0'
        }
      });

      // Sandbox usually returns { code: 200, data: { ... }, ... }
      if (response.data && response.data.code === 200) {
        return response.data.data;
      }
      
      logger.warn(`[Sandbox] HSN Lookup failed for ${hsnCode}:`, response.data);
      return null;
    } catch (error: any) {
      logger.error('[Sandbox] HSN Lookup error:', error.response?.data || error.message);
      return null;
    }
  }
}
