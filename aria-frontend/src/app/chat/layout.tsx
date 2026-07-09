import { ChatStateProvider } from "@/context/ChatStateProvider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatStateProvider>{children}</ChatStateProvider>;
}
