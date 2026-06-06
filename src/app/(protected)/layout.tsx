import React from "react";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
