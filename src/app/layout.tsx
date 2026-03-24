import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Champion Auto Finance CRM",
  description: "Internal Champion Auto Finance CRM for funding operations, vendor management, and email outreach.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
