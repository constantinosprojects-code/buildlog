import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildLog — Proof of Work",
  description: "Automated engineering build log and portfolio builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}