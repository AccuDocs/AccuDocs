import 'reflect-metadata';
import { User, Organization } from './src/models';
import { connectDatabase, disconnectDatabase } from './src/config';

async function test() {
  await connectDatabase();
  try {
    const user = await User.findOne({
      include: [{ model: Organization, as: 'organization' }]
    });
    if (user) {
      console.log('✅ Success: User associated with Organization found.');
      console.log('User:', user.name);
      console.log('Org:', (user as any).organization?.name);
    } else {
      console.log('ℹ️ No users found, but query succeeded.');
    }
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

test();
