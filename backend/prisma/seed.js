const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { shopDomain: 'demo-store.myshopify.com' },
    update: {},
    create: {
      shopDomain: 'demo-store.myshopify.com',
      companyName: 'ACME Retail',
      email: 'admin@acme.com',
      isActive: true,
    },
  });

  console.log('✅ Tenant created:', tenant.companyName);

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@acme.com',
      name: 'Admin User',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ User created:', user.email);

  // Create demo customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: 'customer1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        totalSpent: 15000,
        ordersCount: 5,
        lifetimeValue: 15000,
        lifecycle: 'active',
        emailEngaged: true,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: 'customer2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        totalSpent: 45000,
        ordersCount: 12,
        lifetimeValue: 45000,
        lifecycle: 'active',
        emailEngaged: true,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: 'customer3@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        totalSpent: 2000,
        ordersCount: 1,
        lifetimeValue: 2000,
        lifecycle: 'new',
      },
    }),
  ]);

  console.log('✅ Created', customers.length, 'customers');

  // Create demo segments
  const segments = await Promise.all([
    prisma.segment.create({
      data: {
        tenantId: tenant.id,
        name: 'High-Value VIPs',
        description: 'Customers with lifetime value > ₹50,000',
        type: 'custom',
        customerCount: 8240,
      },
    }),
    prisma.segment.create({
      data: {
        tenantId: tenant.id,
        name: 'At-Risk Customers',
        description: 'No purchase in 30+ days',
        type: 'behavioral',
        customerCount: 7850,
      },
    }),
  ]);

  console.log('✅ Created', segments.length, 'segments');

  // Create demo campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        name: 'Weekend Flash Sale',
        channel: 'WhatsApp',
        status: 'live',
        sent: 10000,
        delivered: 9800,
        opened: 5100,
        clicked: 1200,
        converted: 420,
        revenue: 840000,
        cost: 25000,
        startedAt: new Date(),
      },
    }),
    prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        name: 'New Arrivals Email',
        channel: 'Email',
        status: 'completed',
        sent: 15000,
        delivered: 14500,
        opened: 3800,
        clicked: 980,
        converted: 312,
        revenue: 410000,
        cost: 15000,
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(),
      },
    }),
  ]);

  console.log('✅ Created', campaigns.length, 'campaigns');

  // Create demo journeys
  const journey = await prisma.journey.create({
    data: {
      tenantId: tenant.id,
      name: 'Welcome Journey',
      description: 'Onboard new customers',
      status: 'active',
      enrolledCount: 3240,
      completedCount: 1360,
      conversionRate: 42.0,
    },
  });

  console.log('✅ Created journey:', journey.name);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
