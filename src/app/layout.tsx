import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dealership Vendor CRM",
  description: "Internal CRM for vendor deals and QuickBooks sync tracking.",
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
