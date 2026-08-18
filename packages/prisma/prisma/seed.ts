import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categorias = ["Jardineiro", "Piscineiro", "Pedreiro"];

  for (const nome of categorias) {
    await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
