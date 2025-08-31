import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI News Studio",
  description: "Generate and manage news content with Gemini + LangChain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-semibold">AI News Studio</span>
              <span className="text-xs text-gray-500">by Gemini + LangChain</span>
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <a className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900" href="/news">History</a>
              <a className="px-3 py-1 rounded bg-foreground text-background hover:opacity-90" href="/news/new">New Report</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
