import { PrismaClient } from '@/prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_ROLES } from '@/lib/default-roles';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Admin user
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@portl.com.ph' },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('Portl2026', 10);
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@portl.com.ph',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('Created admin user (admin@portl.com.ph)');
  }

  // 2. Regular user
  let user = await prisma.user.findUnique({
    where: { email: 'miguelarciagaa@gmail.com' },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash('password', 10);
    user = await prisma.user.create({
      data: {
        email: 'miguelarciagaa@gmail.com',
        firstName: 'Miguel',
        lastName: 'Arciaga',
        password: hashedPassword,
        role: 'USER',
      },
    });
    console.log('Created user (miguelarciagaa@gmail.com)');
  }

  // 3. Tenant "Arc" owned by Miguel, with approved application
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'arc' },
    include: { application: true },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        subdomain: 'arc',
        name: 'Arc',
        businessEmail: 'miguelarciagaa@gmail.com',
        businessPhone: '+639000000000',
        ownerId: user.id,
        status: 'ACTIVE',
        application: {
          create: {
            status: 'APPROVED',
            currentStep: 3,
            tosAccepted: true,
            organizerAgreementAccepted: true,
            privacyPolicyAccepted: true,
            communityGuidelinesAccepted: true,
            submittedAt: new Date(),
            reviewedAt: new Date(),
            reviewedBy: adminUser.id,
          },
        },
      },
      include: { application: true },
    });
    console.log('Created tenant "Arc" with approved application');
  }

  // 4. Default roles for tenant
  const existingRoles = await prisma.tenantRole.findMany({
    where: { tenantId: tenant.id },
  });

  let ownerRoleId: string | null = null;

  if (existingRoles.length === 0) {
    for (const roleDef of DEFAULT_ROLES) {
      const role = await prisma.tenantRole.create({
        data: {
          tenantId: tenant.id,
          name: roleDef.name,
          color: roleDef.color,
          permissions: roleDef.permissions,
          position: roleDef.position,
          isDefault: roleDef.isDefault,
          isOwnerRole: roleDef.isOwnerRole,
        },
      });
      if (role.isOwnerRole) ownerRoleId = role.id;
    }
    console.log('Created default roles');
  } else {
    const ownerRole = existingRoles.find((r) => r.isOwnerRole);
    ownerRoleId = ownerRole?.id ?? null;
  }

  // 5. OWNER membership for Miguel
  const membership = await prisma.tenantMember.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      tenantId: tenant.id,
    },
  });

  if (ownerRoleId) {
    await prisma.memberRole.upsert({
      where: {
        tenantMemberId_tenantRoleId: {
          tenantMemberId: membership.id,
          tenantRoleId: ownerRoleId,
        },
      },
      update: {},
      create: {
        tenantMemberId: membership.id,
        tenantRoleId: ownerRoleId,
      },
    });
    console.log('Assigned Owner role to Miguel');
  }

  // 6. Sample event
  const existingEvent = await prisma.event.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!existingEvent) {
    const event = await prisma.event.create({
      data: {
        tenantId: tenant.id,
        name: 'Arc Launch Party',
        description: 'Join us for our grand launch event.',
        venueName: 'Arc Events Space',
        venueAddress: 'Makati City, Metro Manila',
        startDate: new Date('2026-06-15'),
        startTime: '20:00',
        endDate: new Date('2026-06-15'),
        endTime: '02:00',
        status: 'PUBLISHED',
      },
    });
    console.log('Created event:', event.name);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
