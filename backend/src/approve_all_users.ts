import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      verificationStatus: 'APPROVED',
    },
  });

  console.log(`${result.count} utilisateurs ont été mis à jour au statut APPROVED avec succès !`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
