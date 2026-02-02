import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Sidebar from "@/components/sidebar"; // Removed because it's in ProtectedLayout
import AuthProvider from "@/components/AuthProvider";
import ProtectedLayout from "@/components/ProtectedLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "P&L Dashboard System",
  description: "Dashboard System with Role-Based Auth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-black`}
      >
        <AuthProvider>
          <ProtectedLayout>{children}</ProtectedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
