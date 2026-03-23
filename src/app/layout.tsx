import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campaign Generator",
  description: "AI-powered multi-channel campaign generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-[var(--card-border)] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              <span className="text-[var(--accent)]">Campaign</span> Generator
            </a>
            <div className="flex gap-6 text-sm">
              <a href="/" className="hover:text-[var(--accent)] transition-colors">
                Campaigns
              </a>
              <a href="/calendar" className="hover:text-[var(--accent)] transition-colors">
                Calendar
              </a>
              <a href="/companies" className="hover:text-[var(--accent)] transition-colors">
                Companies
              </a>
              <a href="/brand-voices" className="hover:text-[var(--accent)] transition-colors">
                Brand Voices
              </a>
              <a href="/variables" className="hover:text-[var(--accent)] transition-colors">
                Variables
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
