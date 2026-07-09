export function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-dimmer first:mt-0">
      {children}
    </div>
  );
}
