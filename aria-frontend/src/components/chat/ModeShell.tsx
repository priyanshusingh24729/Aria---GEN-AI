import { Logo } from "@/components/Logo";
import { ModeNav } from "./ModeNav";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AIBackdrop } from "@/components/auth/ai-backdrop";
interface ModeShellProps {
  header: React.ReactNode;
  sidebarExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function ModeShell({ header, sidebarExtra, children }: ModeShellProps) {
  return (
//     <div className="flex h-screen overflow-hidden bg-bg">
//       <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-5">
//         <div className="mb-6">
//           <Logo size="sm" />
//         </div>

//         <ModeNav />

//         {sidebarExtra}

//         <div className="flex-1" />

//         <div className="mt-6 border-t border-border pt-4">
//           <SignOutButton />
//         </div>
//       </aside>

//       <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
//         {header}
//         <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
//       </main>
//     </div>
//   );
// }

  <div className="relative h-screen overflow-hidden">

    {/* AI Animated Background */}
    <AIBackdrop />

    {/* Dark overlay for readability */}
    <div className="absolute inset-0 bg-black/35" />

    {/* Main UI */}
    <div className="relative z-10 flex h-screen overflow-hidden">

      {/* Sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-surface/60 backdrop-blur-xl p-5">
        <div className="mb-6">
          <Logo size="sm" />
        </div>

        <ModeNav />

        {sidebarExtra}

        <div className="flex-1" />

        <div className="mt-6 border-t border-white/10 pt-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        {header}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </main>

    </div>
  </div>

    );
}