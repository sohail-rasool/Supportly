// Database connection: import `prisma` from "@/lib/prisma" in server code
// (Server Components, Server Functions, Route Handlers).
import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your PostgreSQL connection string."
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// Reuse one client across hot reloads in dev; otherwise every file change
// would open a new connection pool and eventually exhaust the database.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
  prismaClientClass?: typeof PrismaClient
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma
  // After `prisma generate` (e.g. new models), the generated module reloads with
  // a new PrismaClient class. A client cached from the old one wouldn't have the
  // new models (prisma.conversation === undefined), so replace it.
  if (cached && globalForPrisma.prismaClientClass === PrismaClient) return cached

  void cached?.$disconnect()
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
    globalForPrisma.prismaClientClass = PrismaClient
  }
  return client
}

export const prisma = getPrismaClient()
