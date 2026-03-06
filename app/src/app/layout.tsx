import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./style.css";
import {  FooterNew, NavBarNew, ConditionalSearchBar } from "@/shared/components/layout";
import { NetworkProvider } from "@/features/networks/context/NetworkContext";
import { PostHogProvider } from "@/lib/analytics";

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
        <PostHogProvider>
          <NetworkProvider>
            <NavBarNew />
            <ConditionalSearchBar />
            <main className="flex-1 container py-6 md:py-10">{children}</main>
            <FooterNew />
          </NetworkProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
