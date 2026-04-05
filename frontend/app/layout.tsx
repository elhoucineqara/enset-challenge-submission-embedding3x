import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { StorageProvider } from "@/contexts/StorageContext";

export const metadata: Metadata = {
  title: "Agentic TP Platform",
  description: "AI-powered practical work platform for students and teachers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-[#1a1a2e] min-h-screen`}
      >
        <StorageProvider>
          <AuthProvider>{children}</AuthProvider>
        </StorageProvider>
      </body>
    </html>
  );
}
