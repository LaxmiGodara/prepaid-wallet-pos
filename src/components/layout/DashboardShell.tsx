import Sidebar from "@/components/layout/Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="h-screen overflow-hidden grid grid-cols-[260px_1fr]">
      <Sidebar />

      <main className="overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
