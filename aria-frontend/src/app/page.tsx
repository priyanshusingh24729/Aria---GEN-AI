import { redirect } from "next/navigation";

// middleware.ts has already sent signed-out visitors to /login by the time
// this renders, so anyone landing on "/" is authenticated — send them in.
export default function RootPage() {
  redirect("/chat");
}
