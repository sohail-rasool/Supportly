import type { Metadata } from "next"

import { requireUnauth } from "@/modules/auth/actions"
import { SignInForm } from "@/modules/auth/components/sign-in-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function SignInPage() {
  // Already signed in? Go home instead of showing the form.
  await requireUnauth()

  return <SignInForm />
}
