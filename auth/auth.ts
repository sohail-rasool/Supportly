import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { dash, sentinel } from "@better-auth/infra"

import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    // Connects this app to the Better Auth dashboard (needs BETTER_AUTH_API_KEY).
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    // Bot / credential-stuffing protection.
    sentinel({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    // Keep last: lets Server Functions set auth cookies.
    nextCookies(),
  ],
})
