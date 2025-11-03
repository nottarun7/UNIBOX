const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("Seed: admin user exists, skipping");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
    },
  });

  const team = await prisma.team.create({ data: { name: "Default Team" } });
  await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id, role: "admin" } });

  await prisma.integration.create({ data: { provider: "twilio", config: {}, teamId: team.id } });

  console.log("Seed: created admin user and default team");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
