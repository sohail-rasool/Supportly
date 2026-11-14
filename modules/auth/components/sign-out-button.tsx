"use client"

import { useFormStatus } from "react-dom"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { signOutAction } from "../actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button className="cursor-pointer" type="submit" variant="destructive" disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" />}
      Log out
    </Button>
  )
}

export function SignOutButton() {
  // A form action works before JS loads, and signOutAction redirects to /sign-in.
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  )
}
