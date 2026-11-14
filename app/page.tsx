import { ChatApp } from "@/modules/chat/components/chat-app";

// Signed-in only: proxy.ts redirects visitors without a valid session to /sign-in.
export default function Home() {
  return <ChatApp />;
}
