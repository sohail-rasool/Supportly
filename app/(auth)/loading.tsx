import { Spinner } from "@/components/ui/spinner"

// Suspense fallback for the auth pages. They read the session from request
// headers (requireUnauth), so with Cache Components this boundary lets the rest
// of the page prerender while the session check streams in.
export default function AuthLoading() {
  return <Spinner className="size-6 text-muted-foreground" />
}
