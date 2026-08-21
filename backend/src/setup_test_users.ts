import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Créer ou mettre à jour l'administrateur
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { 
      role: 'ADMIN', 
      verificationStatus: 'APPROVED' 
    },
    create: {
      email: 'admin@gmail.com',
      displayName: 'Administrateur',
      passwordHash,
      role: 'ADMIN',
      verificationStatus: 'APPROVED',
    },
  });

  // 2. Créer ou mettre à jour un membre standard
  const member = await prisma.user.upsert({
    where: { email: 'member@gmail.com' },
    update: {},
    create: {
      email: 'member@gmail.com',
      displayName: 'Membre Test',
      passwordHash,
      role: 'USER',
      verificationStatus: 'DRAFT',
    },
  });

  console.log('Comptes de test configurés avec succès !');
  console.log('Compte Admin : admin@gmail.com / [MASQUÉ]');
  console.log('Compte Membre : member@gmail.com / [MASQUÉ]');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
