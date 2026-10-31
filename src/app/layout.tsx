import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathDuino — ESP32 Recycling & Math Quiz Station",
  description:
    "Student and admin web portals for the MathDuino IoT project: live 16x2 LCD mirror, math quiz practice, points reward shop, real-time ESP32 telemetry, system logs and multi-station management.",
  keywords: [
    "MathDuino",
    "ESP32",
    "IoT",
    "recycling",
    "math quiz",
    "school project",
    "dashboard",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        {children}
        <SonnerToaster
          theme="dark"
          position="bottom-right"
          closeButton
          toastOptions={{
            style: {
              background: "rgba(2, 6, 23, 0.95)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#e2e8f0",
              boxShadow: "0 0 24px rgba(16, 185, 129, 0.15)",
            },
          }}
        />
      </body>
    </html>
  );
}
