import { User } from '../models';

async function check() {
  try {
    const user = await User.findOne({ where: { mobile: '9876543210' } });
    if (user) {
      console.log('User found:', {
        id: user.id,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password
      });
    } else {
      console.log('User NOT found for mobile 9876543210');
    }
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
