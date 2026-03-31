import { PrismaClient } from '@/prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_ROLES } from '@/lib/default-roles';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Find or create a test user
  let testUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('✅ Created test admin user');
  }

  // Find or create a test tenant with approved application
  let testTenant = await prisma.tenant.findUnique({
    where: { subdomain: 'test-org' },
    include: { application: true },
  });

  if (!testTenant) {
    testTenant = await prisma.tenant.create({
      data: {
        subdomain: 'test-org',
        name: 'Test Organization',
        businessEmail: 'test@example.com',
        businessPhone: '+1234567890',
        ownerId: testUser.id,
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
            reviewedBy: testUser.id,
          },
        },
      },
      include: { application: true },
    });
    console.log('✅ Created test tenant with approved application');

    // Create OWNER membership (roles assigned below)
    await prisma.tenantMember.create({
      data: {
        userId: testUser.id,
        tenantId: testTenant.id,
      },
    });
    console.log('✅ Created OWNER membership for test tenant');
  } else if (testTenant.application?.status !== 'APPROVED') {
    // Update existing tenant application to approved
    await prisma.organizerApplication.update({
      where: { tenantId: testTenant.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: testUser.id,
      },
    });
    await prisma.tenant.update({
      where: { id: testTenant.id },
      data: { status: 'ACTIVE' },
    });
    console.log('✅ Updated tenant application to approved');
  }

  // Seed default roles for the tenant
  const existingRoles = await prisma.tenantRole.findMany({
    where: { tenantId: testTenant.id },
  });

  let ownerRoleId: string | null = null;

  if (existingRoles.length === 0) {
    for (const roleDef of DEFAULT_ROLES) {
      const role = await prisma.tenantRole.create({
        data: {
          tenantId: testTenant.id,
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
    console.log('✅ Created default roles for test tenant');
  } else {
    const ownerRole = existingRoles.find((r) => r.isOwnerRole);
    ownerRoleId = ownerRole?.id ?? null;
  }

  // Ensure OWNER membership exists
  const membership = await prisma.tenantMember.upsert({
    where: {
      userId_tenantId: {
        userId: testUser.id,
        tenantId: testTenant.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      tenantId: testTenant.id,
    },
  });

  // Assign Owner role if not already assigned
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
    console.log('✅ Assigned Owner role to test user');
  }

  // Create a sample event linked to the tenant
  const event = await prisma.event.create({
    data: {
      tenantId: testTenant.id,
      name: 'Summer Music Festival 2024',
      description: 'An amazing outdoor music festival featuring top artists from around the world.',
      venueName: 'Central Park',
      venueAddress: '123 Park Avenue, New York, NY 10001',
      startDate: new Date('2024-07-15'),
      startTime: '18:00',
      endDate: new Date('2024-07-15'),
      endTime: '23:00',
      status: 'PUBLISHED',
    },
  });

  console.log('✅ Created event:', event.name, 'for tenant:', testTenant.subdomain);

  // Create tables: 2 EXCLUSIVE and 1 SHARED
  const tableA1 = await prisma.table.create({
    data: {
      eventId: event.id,
      label: 'A1',
      capacity: 6,
      minSpend: 500, // ₱500.00
      mode: 'EXCLUSIVE',
      notes: 'VIP table near stage',
    },
  });

  const tableA2 = await prisma.table.create({
    data: {
      eventId: event.id,
      label: 'A2',
      capacity: 8,
      minSpend: 600, // ₱600.00
      mode: 'EXCLUSIVE',
      notes: 'VIP table near stage',
    },
  });

  const tableS1 = await prisma.table.create({
    data: {
      eventId: event.id,
      label: 'S1',
      capacity: 10,
      mode: 'SHARED',
      notes: 'Shared seating area',
    },
  });

  console.log('✅ Created tables: A1, A2, S1');

  // Auto-generate seats for all tables
  const seatsA1 = [];
  for (let i = 1; i <= tableA1.capacity; i++) {
    seatsA1.push({ tableId: tableA1.id, seatIndex: i });
  }
  await prisma.seat.createMany({ data: seatsA1 });

  const seatsA2 = [];
  for (let i = 1; i <= tableA2.capacity; i++) {
    seatsA2.push({ tableId: tableA2.id, seatIndex: i });
  }
  await prisma.seat.createMany({ data: seatsA2 });

  const seatsS1 = [];
  for (let i = 1; i <= tableS1.capacity; i++) {
    seatsS1.push({ tableId: tableS1.id, seatIndex: i });
  }
  await prisma.seat.createMany({ data: seatsS1 });

  console.log('✅ Generated seats for all tables');

  // Create ticket types
  const generalTicket = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: 'General Admission',
      description: 'General admission ticket for the festival',
      kind: 'GENERAL',
      basePrice: 75, // ₱75.00
      quantityTotal: 1000,
      quantitySold: 0,
      transferrable: true,
      cancellable: true,
    },
  });

  const tableTicket = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: 'VIP Table A1',
      description: 'Whole table purchase for table A1',
      kind: 'TABLE',
      basePrice: 500, // ₱500.00
      quantityTotal: 1,
      quantitySold: 0,
      tableId: tableA1.id,
      transferrable: true,
      cancellable: false,
    },
  });

  const seatTicket = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: 'Individual Seat - Table S1',
      description: 'Individual seat in shared table S1',
      kind: 'SEAT',
      basePrice: 50, // ₱50.00
      quantityTotal: tableS1.capacity,
      quantitySold: 0,
      tableId: tableS1.id,
      transferrable: true,
      cancellable: true,
    },
  });

  console.log('✅ Created ticket types: General, Table, Seat');

  // Create price tiers for each ticket type
  const now = new Date();
  const earlyBirdEnd = new Date(now);
  earlyBirdEnd.setDate(earlyBirdEnd.getDate() + 30);

  // General Admission tiers
  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: generalTicket.id,
      name: 'Early Bird',
      price: 60, // ₱60.00
      strategy: 'TIME_WINDOW',
      startsAt: now,
      endsAt: earlyBirdEnd,
      priority: 10,
    },
  });

  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: generalTicket.id,
      name: 'Regular',
      price: 75, // ₱75.00
      strategy: 'TIME_WINDOW',
      startsAt: earlyBirdEnd,
      endsAt: new Date(event.startDate),
      priority: 5,
    },
  });

  // Table ticket tiers
  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: tableTicket.id,
      name: 'Early Bird',
      price: 450, // ₱450.00
      strategy: 'TIME_WINDOW',
      startsAt: now,
      endsAt: earlyBirdEnd,
      priority: 10,
    },
  });

  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: tableTicket.id,
      name: 'Regular',
      price: 500, // ₱500.00
      strategy: 'TIME_WINDOW',
      startsAt: earlyBirdEnd,
      endsAt: new Date(event.startDate),
      priority: 5,
    },
  });

  // Seat ticket tiers
  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: seatTicket.id,
      name: 'Early Bird',
      price: 40, // ₱40.00
      strategy: 'ALLOCATION',
      allocationTotal: 5,
      allocationSold: 0,
      priority: 10,
    },
  });

  await prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId: seatTicket.id,
      name: 'Regular',
      price: 50, // ₱50.00
      strategy: 'ALLOCATION',
      allocationTotal: 5,
      allocationSold: 0,
      priority: 5,
    },
  });

  console.log('✅ Created price tiers for all ticket types');

  // Create a promotion
  const promotion = await prisma.promotion.create({
    data: {
      eventId: event.id,
      name: 'Summer Sale',
      description: '20% off all tickets for a limited time',
      requiresCode: true,
      discountType: 'PERCENT',
      discountValue: 2000, // 20% (2000 basis points)
      appliesTo: 'ITEM',
      validFrom: now,
      validUntil: earlyBirdEnd,
      maxRedemptions: 100,
      maxPerUser: 2,
    },
  });

  console.log('✅ Created promotion:', promotion.name);

  // Link promotion to specific ticket types
  await prisma.promotionTicketType.createMany({
    data: [
      { promotionId: promotion.id, ticketTypeId: generalTicket.id },
      { promotionId: promotion.id, ticketTypeId: seatTicket.id },
    ],
  });

  // Create voucher codes
  await prisma.voucherCode.create({
    data: {
      promotionId: promotion.id,
      code: 'SUMMER2024',
      maxRedemptions: 50,
      redeemedCount: 0,
    },
  });

  await prisma.voucherCode.create({
    data: {
      promotionId: promotion.id,
      code: 'EARLYBIRD',
      maxRedemptions: 30,
      redeemedCount: 0,
    },
  });

  console.log('✅ Created voucher codes: SUMMER2024, EARLYBIRD');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
