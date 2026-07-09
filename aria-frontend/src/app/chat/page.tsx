import { redirect } from "next/navigation";

// proxy.ts already guarantees a signed-in user reaches this far.
// /chat itself has no UI of its own — General Chat is the default mode.
export default function ChatIndexPage() {
  redirect("/chat/general");
}
