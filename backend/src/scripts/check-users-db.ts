import { User, Organization } from '../models';

async function checkUser() {
  const users = await User.findAll({
    include: [{ model: Organization, as: 'organization' }]
  }) as Array<User & { organization?: Organization }>;
  console.log('--- Current Users in DB ---');
  users.forEach(u => {
    console.log(`Mobile: ${u.mobile}, Role: ${u.role}, Org: ${u.organization?.name} (${u.organizationId}), isActive: ${u.isActive}`);
  });
  process.exit(0);
}

checkUser();
