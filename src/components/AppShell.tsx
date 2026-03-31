"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";

const publicRoutes = ["/", "/login", "/signup", "/pricing"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isPublicRoute = publicRoutes.includes(pathname);

  // Public pages — no sidebar
  if (isPublicRoute || !user) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Authenticated — sidebar layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 p-8"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
