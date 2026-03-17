import 'reflect-metadata';
import '../main/container';
import { container } from 'tsyringe';
import { AuthService } from '../modules/auth/application/services/AuthService';
import { sequelize } from '../config/database.config';

async function test() {
  try {
    await sequelize.authenticate();
    const service = container.resolve(AuthService);
    console.log('Testing adminLogin...');
    const result = await service.adminLogin('9726153961', 'Admin@123', 'localhost');
    console.log('Success:', Object.keys(result));
  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    process.exit(0);
  }
}

test();
