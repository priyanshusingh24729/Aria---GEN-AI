"use client";

import { GeneralChatProvider } from "./GeneralChatContext";
import { DocumentsProvider } from "./DocumentsContext";
import { ImagesProvider } from "./ImagesContext";
import { SqlProvider } from "./SqlContext";

// Mounted once in src/app/chat/layout.tsx, which stays alive across
// navigation between /chat/general, /chat/documents, /chat/images, and
// /chat/sql — so each mode's state survives switching tabs, the same way
// the original app's st.session_state did.
export function ChatStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <GeneralChatProvider>
      <DocumentsProvider>
        <ImagesProvider>
          <SqlProvider>{children}</SqlProvider>
        </ImagesProvider>
      </DocumentsProvider>
    </GeneralChatProvider>
  );
}
