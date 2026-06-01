const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Aarovia CRM (JS seed) ...')

  const hashedPassword = await bcrypt.hash('Admin@1234', 12)

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  console.log('\n🎉 Seeding complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Super Admin   : admin@aarovia.co.in / Admin@1234')
  console.log('   Sales Manager : manager@aarovia.co.in / Admin@1234')
  console.log('   Sales Exec    : arjun@aarovia.co.in / Admin@1234')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
