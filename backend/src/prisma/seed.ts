import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@los4.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) {
    console.log('Admin ya existe:', existing.username);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      displayName: 'Admin',
      role: 'MASTER',
      points: 9999
    }
  });

  console.log('✅ Admin creado:', username, '/', password);
  console.log('ℹ️  Genera invitaciones desde el panel Admin o Perfil');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
