"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { cn } from "../lib/utils";
import { Home, Users, Store, Link as LinkIcon } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/stores",
    label: "Stores",
    icon: Store,
  },
  {
    href: "/excel_links",
    label: "Excel Links",
    icon: LinkIcon,
  },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex-1 flex flex-col gap-2 p-4">
      <div className="hidden md:block text-center text-xl font-bold text-black py-4 border-b ">
        PL Admin Panel
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition",
              isActive && "bg-gray-200 font-semibold",
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function BottomNavBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white border-t shadow-md md:hidden h-16">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-2 py-1 text-xs text-gray-700 hover:text-blue-600 transition",
              isActive && "text-blue-600 font-semibold",
            )}
          >
            <Icon className="w-6 h-6" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  // Hide sidebar and bottom nav for client
  if (user.role === "client") return null;

  // Admin: show sidebar on md+ and bottom nav on mobile
  return (
    <>
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r shadow-sm sticky left-0 top-0">
        <SidebarContent pathname={pathname} />
      </aside>
      {/* Bottom nav for mobile */}
      <BottomNavBar pathname={pathname} />
    </>
  );
}
