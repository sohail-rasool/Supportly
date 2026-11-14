"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from "../schemas";

/** Returned by form actions instead of throwing, so the form can show it. */
export type ActionResult = { error: string } | undefined;

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** Returns the current user plus their database role (USER / ADMIN). */
export async function getCurrentUserWithRole() {
  const session = await getSession();
  if (!session?.user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    ...session.user,
    role: dbUser?.role ?? "USER",
  };
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireUnauth() {
  const session = await getSession();
  if (session) redirect("/");
}

export async function signInAction(data: SignInInput): Promise<ActionResult> {
  // Still validated: the type only helps callers; at runtime a Server Action
  // can be called with any payload.
  const parsed = signInSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message || "Invalid email or password" };
    }
    throw error;
  }

  // Outside try/catch: redirect() works by throwing, which must not be caught.
  redirect("/");
}

export async function signUpAction(data: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message || "Could not create account" };
    }
    throw error;
  }

  redirect("/");
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/sign-in");
}
