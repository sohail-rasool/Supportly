import type { Metadata } from "next"

import { requireUnauth } from "@/modules/auth/actions"
import { SignUpForm } from "@/modules/auth/components/sign-up-form"

export const metadata: Metadata = {
  title: "Sign up",
}

export default async function SignUpPage() {
  // Already signed in? Go home instead of showing the form.
  await requireUnauth()

  return <SignUpForm />
}
