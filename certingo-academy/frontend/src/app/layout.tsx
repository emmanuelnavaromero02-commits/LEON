import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Certingo Academy | Enterprise Adaptive Learning",
  description: "Next-generation certification preparation powered by pedagogical AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
