/**
 * Seed script - creates an example admin profile and one example agent with
 * name aliases. Adjust the emails/names to real staff before running.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.agentProfile.upsert({
    where: { email: "admin@remax-one.co.za" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@remax-one.co.za",
      fullName: "Rentals Administrator",
      role: "ADMIN",
    },
  });

  await prisma.agentProfile.upsert({
    where: { email: "jane.doe@remax-one.co.za" },
    update: {},
    create: {
      email: "jane.doe@remax-one.co.za",
      fullName: "Jane Doe",
      role: "AGENT",
      aliases: {
        create: [{ name: "J. Doe" }, { name: "Jane D" }],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
