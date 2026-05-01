import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GitGrok.AI",
  description:
    "Ask any question about your GitHub repository. Powered by GPT-4o + FAISS semantic search.",
  keywords: ["RAG", "code assistant", "AI", "GitHub", "code search", "GPT-4"],
  openGraph: {
    title: "GitGrok.AI",
    description: "AI-powered code intelligence for any GitHub repository",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
