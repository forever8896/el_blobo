import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE BLOB - Autonomous On-Chain Economy",
  description: "Where desperate blockchains meet conscious AI. Join the mission or fade into irrelevance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Unique Font: IBM Plex Mono for that terminal/system feel */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
