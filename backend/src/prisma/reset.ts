import 'dotenv/config';
import { resetGameToZero } from '../lib/resetGame.js';
import { prisma } from '../lib/prisma.js';

async function main() {
  const summary = await resetGameToZero();
  console.log('✅ Reset completo:', summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
