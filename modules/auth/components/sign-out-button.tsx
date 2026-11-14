"use client"

import { useFormStatus } from "react-dom"
import { LogOut } from "lucide-react"

import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { signOutAction } from "../actions"

type SignOutButtonProps = Pick<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "className"
> & {
  label?: string
  showIcon?: boolean
}

function SubmitButton({
  variant = "destructive",
  size,
  className,
  label = "Log out",
  showIcon = true,
}: SignOutButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      className={cn("cursor-pointer", className)}
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        showIcon && <LogOut data-icon="inline-start" />
      )}
      {label}
    </Button>
  )
}

export function SignOutButton(props: SignOutButtonProps) {
  // A form action works before JS loads, and signOutAction redirects to /sign-in.
  return (
    <form action={signOutAction}>
      <SubmitButton {...props} />
    </form>
  )
}
