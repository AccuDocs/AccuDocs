import { injectable } from 'tsyringe';
import { IOtpRepository } from '../../domain/repositories/IOtpRepository';
import { Otp } from '../../domain/entities/Otp';
import { Otp as OtpModel } from '../../../../models';
import { Op } from 'sequelize';

@injectable()
export class SequelizeOtpRepository implements IOtpRepository {
  private toEntity(model: OtpModel): Otp {
    const props = {
      mobile: model.mobile,
      otpHash: model.otpHash,
      purpose: model.purpose as any,
      expiresAt: model.expiresAt,
      attempts: model.attempts,
      isUsed: model.isUsed,
      ipAddress: model.ipAddress,
      createdAt: model.createdAt
    };
    return Otp.create(props, model.id).getValue();
  }

  async save(otp: Otp): Promise<Otp> {
    const data = {
      mobile: otp.mobile,
      otpHash: otp.otpHash,
      purpose: otp.purpose,
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
      isUsed: otp.isUsed,
      ipAddress: otp.ipAddress
    };

    if (otp.id) {
      const [_, updated] = await OtpModel.update(data, {
        where: { id: otp.id },
        returning: true
      });
      if (updated.length > 0) return this.toEntity(updated[0]);
      const found = await OtpModel.findByPk(otp.id);
      return this.toEntity(found!);
    } else {
      const created = await OtpModel.create(data);
      return this.toEntity(created);
    }
  }

  async findLatestUnused(mobile: string): Promise<Otp | null> {
    const model = await OtpModel.findOne({
      where: {
        mobile,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });
    return model ? this.toEntity(model) : null;
  }

  async incrementAttempts(id: string): Promise<number> {
    await OtpModel.increment('attempts', { by: 1, where: { id } });
    const model = await OtpModel.findByPk(id);
    return model!.attempts;
  }

  async markAsUsed(id: string): Promise<void> {
    await OtpModel.update({ isUsed: true }, { where: { id } });
  }

  async deleteUnusedForMobile(mobile: string): Promise<void> {
    await OtpModel.destroy({
      where: {
        mobile,
        isUsed: false
      }
    });
  }

  async deleteExpired(): Promise<number> {
    return await OtpModel.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });
  }
}
