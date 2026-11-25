import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "Martha Motors · Talk to Martha",
  description:
    "Martha Motors (a fictional EV brand) — talk to Martha, our AI sales advisor, to find the right electric car.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
