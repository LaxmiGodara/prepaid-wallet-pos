import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="h-screen overflow-hidden grid grid-cols-[260px_1fr]">
      <Sidebar />

      <div className="grid grid-rows-[auto_1fr] overflow-hidden">
        <TopBar />
        <main className="overflow-y-auto bg-[var(--color-paper)]">
          {children}
        </main>
      </div>
    </div>
  );
}
