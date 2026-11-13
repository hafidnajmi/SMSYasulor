import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IM Digital - Instruksi Mutu",
  description: "Digital Instruction & Quality System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
