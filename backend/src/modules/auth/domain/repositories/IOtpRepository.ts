import { Otp } from '../entities/Otp';

export interface IOtpRepository {
  save(otp: Otp): Promise<Otp>;
  findLatestUnused(mobile: string): Promise<Otp | null>;
  incrementAttempts(id: string): Promise<number>;
  markAsUsed(id: string): Promise<void>;
  deleteUnusedForMobile(mobile: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
