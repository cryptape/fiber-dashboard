import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./style.css";
import {  FooterNew, NavBarNew } from "@/shared/components/layout";
import { NetworkProvider } from "@/features/networks/context/NetworkContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lightning Network Dashboard",
  description: "Real-time insights into the Lightning Network infrastructure",
  keywords: ["lightning network", "bitcoin", "dashboard", "analytics"],
  authors: [{ name: "Lightning Network Dashboard" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        <NetworkProvider>
          <NavBarNew />
          <main className="flex-1 container mt-[60px] md:mt-[72px] py-10">{children}</main>
          <FooterNew />
        </NetworkProvider>
      </body>
    </html>
  );
}
