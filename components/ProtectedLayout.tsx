"use client";

import { useAuth } from "@/components/AuthProvider";
import LoginPage from "@/components/LoginPage";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Allow unrestricted access to the seed page
  if (pathname === "/seed") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen min-h-0">
      <Sidebar />
      <main className="flex-1 overflow-auto mb-30">{children}</main>
    </div>
  );
}
