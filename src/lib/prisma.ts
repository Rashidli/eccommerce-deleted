import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 driver adapter tələb edir — `url` artıq schema.prisma-da saxlanmır.
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL təyin olunmayıb");

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

// Dev-də hot reload hər dəfə yeni klient yaratmasın deyə qlobalda saxlanır.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
