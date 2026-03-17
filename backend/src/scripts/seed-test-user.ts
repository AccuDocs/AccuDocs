import { Organization, User } from '../models';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    // 1. Create Organization
    let org = await Organization.findOne({ where: { slug: 'accudocs-test' } });
    if (!org) {
      org = await Organization.create({
        name: 'AccuDocs Test Org',
        slug: 'accudocs-test',
        subscriptionPlan: 'enterprise',
        isActive: true
      });
      console.log('Created test organization:', org.id);
    } else {
      console.log('Test organization already exists');
    }

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash('adminPassword123', 10);
    let user = await User.findOne({ where: { mobile: '9876543210' } });
    if (!user) {
      user = await User.create({
        organizationId: org.id,
        name: 'Super Admin',
        mobile: '9876543210',
        role: 'super_admin',
        password: passwordHash,
        isActive: true
      });
      console.log('Created test admin user:', user.id);
    } else {
      console.log('Test admin user already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
