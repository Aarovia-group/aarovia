import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Aarovia CRM database...')

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Admin@1234', 12)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@aarovia.co.in' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@aarovia.co.in',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '+91 9000000001',
    },
  })

  const salesManager = await prisma.user.upsert({
    where: { email: 'manager@aarovia.co.in' },
    update: {},
    create: {
      name: 'Rajesh Desai',
      email: 'manager@aarovia.co.in',
      password: hashedPassword,
      role: 'SALES_MANAGER',
      phone: '+91 9000000002',
    },
  })

  const exec1 = await prisma.user.upsert({
    where: { email: 'arjun@aarovia.co.in' },
    update: {},
    create: {
      name: 'Arjun Rawat',
      email: 'arjun@aarovia.co.in',
      password: hashedPassword,
      role: 'SALES_EXECUTIVE',
      phone: '+91 9000000003',
    },
  })

  const exec2 = await prisma.user.upsert({
    where: { email: 'sanjana@aarovia.co.in' },
    update: {},
    create: {
      name: 'Sanjana Mishra',
      email: 'sanjana@aarovia.co.in',
      password: hashedPassword,
      role: 'SALES_EXECUTIVE',
      phone: '+91 9000000004',
    },
  })

  const telecaller = await prisma.user.upsert({
    where: { email: 'paresh@aarovia.co.in' },
    update: {},
    create: {
      name: 'Paresh Kumar',
      email: 'paresh@aarovia.co.in',
      password: hashedPassword,
      role: 'TELECALLER',
      phone: '+91 9000000005',
    },
  })

  console.log('✅ Users created')

  // Create Projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-heights-001' },
    update: {},
    create: {
      id: 'project-heights-001',
      name: 'Aarovia Heights',
      description: 'Premium luxury apartments in the heart of the city',
      location: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      reraNumber: 'P02400001234',
      minPrice: 8500000,
      maxPrice: 25000000,
      propertyTypes: ['APARTMENT', 'VILLA'],
      amenities: ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Children Play Area', 'Landscaped Gardens', '24/7 Security', 'Power Backup', 'EV Charging'],
      totalUnits: 200,
      availableUnits: 142,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'project-greens-002' },
    update: {},
    create: {
      id: 'project-greens-002',
      name: 'Aarovia Greens',
      description: 'Villa community with private gardens and world-class amenities',
      location: 'Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      reraNumber: 'P02400005678',
      minPrice: 15000000,
      maxPrice: 45000000,
      propertyTypes: ['VILLA', 'PLOT'],
      amenities: ['Private Garden', 'Tennis Court', 'Spa & Wellness', 'Concierge Service', 'Smart Home', 'Home Theater'],
      totalUnits: 80,
      availableUnits: 35,
    },
  })

  console.log('✅ Projects created')

  // Create Inventory
  const towers = ['A', 'B', 'C']
  const inventoryData = []
  for (const tower of towers) {
    for (let floor = 1; floor <= 5; floor++) {
      for (let unit = 1; unit <= 4; unit++) {
        const statuses = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'SOLD', 'BLOCKED', 'RESERVED']
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)] as any
        inventoryData.push({
          unitNumber: `${tower}-${floor}0${unit}`,
          tower: `Tower ${tower}`,
          floor,
          area: 1200 + Math.floor(Math.random() * 800),
          facing: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          baseRate: 6500 + Math.floor(Math.random() * 2000),
          propertyType: 'APARTMENT' as any,
          status: randomStatus,
          bedrooms: unit <= 2 ? 2 : 3,
          bathrooms: unit <= 2 ? 2 : 3,
          projectId: project1.id,
        })
      }
    }
  }

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: { projectId_unitNumber: { projectId: inv.projectId, unitNumber: inv.unitNumber } },
      update: {},
      create: inv,
    })
  }

  console.log('✅ Inventory created')

  // Create Leads
  const leadsData = [
    { name: 'Rahul Sharma', mobile: '9876543210', email: 'rahul@gmail.com', budget: 8500000, city: 'Hyderabad', source: 'FACEBOOK' as any, status: 'NEW' as any },
    { name: 'Priya Mehta', mobile: '9876543211', email: 'priya@gmail.com', budget: 12000000, city: 'Hyderabad', source: 'WEBSITE' as any, status: 'FOLLOWUP' as any },
    { name: 'Amit Patel', mobile: '9876543212', email: 'amit@gmail.com', budget: 6500000, city: 'Mumbai', source: 'MAGICBRICKS' as any, status: 'INTERESTED' as any },
    { name: 'Sneha Iyer', mobile: '9876543213', email: 'sneha@gmail.com', budget: 20000000, city: 'Hyderabad', source: 'REFERRAL' as any, status: 'SITE_VISIT_FIXED' as any },
    { name: 'Kiran Nair', mobile: '9876543214', email: 'kiran@gmail.com', budget: 9000000, city: 'Bangalore', source: 'ACRES_99' as any, status: 'QUALIFIED' as any },
    { name: 'Vikram Joshi', mobile: '9876543215', email: 'vikram@gmail.com', budget: 15000000, city: 'Hyderabad', source: 'WALK_IN' as any, status: 'OPPORTUNITY' as any },
    { name: 'Neha Reddy', mobile: '9876543216', email: 'neha@gmail.com', budget: 7500000, city: 'Hyderabad', source: 'DIRECT_CALL' as any, status: 'SITE_VISIT_DONE' as any },
    { name: 'Deepak Singh', mobile: '9876543217', email: 'deepak@gmail.com', budget: 32000000, city: 'Delhi', source: 'WEBSITE' as any, status: 'OPPORTUNITY_INTERESTED' as any },
  ]

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: {
        ...lead,
        propertyType: 'APARTMENT',
        assignedToId: exec1.id,
        createdById: exec1.id,
        projectId: project1.id,
        nextFollowupDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        tags: ['warm', 'budget-ready'],
      },
    }).catch(() => {}) // Skip duplicates
  }

  console.log('✅ Leads created')

  // Settings
  await prisma.settings.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: 'Aarovia Real Estates', group: 'general' },
  })

  await prisma.settings.upsert({
    where: { key: 'gst_rate' },
    update: {},
    create: { key: 'gst_rate', value: '5', group: 'billing' },
  })

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      { userId: superAdmin.id, title: 'New Lead Assigned', message: 'Rahul Sharma has been assigned to Arjun Rawat', channel: 'IN_APP' },
      { userId: superAdmin.id, title: 'Site Visit Scheduled', message: 'Sneha Iyer - Site visit scheduled for tomorrow 11 AM', channel: 'IN_APP' },
      { userId: superAdmin.id, title: 'Payment Due Alert', message: '3 bookings have overdue payments. Total due: ₹24,50,000', channel: 'IN_APP' },
      { userId: exec1.id, title: 'Followup Reminder', message: 'You have 5 leads with pending followups today', channel: 'IN_APP' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Settings and notifications created')
  console.log('\n🎉 Seeding complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Super Admin : admin@aarovia.co.in / Admin@1234')
  console.log('   Sales Manager: manager@aarovia.co.in / Admin@1234')
  console.log('   Sales Exec  : arjun@aarovia.co.in / Admin@1234')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
