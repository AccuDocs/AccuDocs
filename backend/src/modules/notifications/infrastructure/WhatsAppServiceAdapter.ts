import { injectable } from "tsyringe";
import { logger } from "../../../utils/logger";

@injectable()
export class WhatsAppServiceAdapter {
  async sendOTP(mobile: string, otp: string) {
    logger.info(`Stub: Sending OTP ${otp} to ${mobile} via WhatsApp...`);
  }
}
