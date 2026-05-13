import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Web3Provider } from "@/providers/web3";
import "./globals.css";
import "@/styles/design-tokens.css";

const displayFont = DM_Sans({ 
  subsets: ['latin'], 
  weight: ['700', '800'],
  variable: '--font-display' 
})
const bodyFont = DM_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600'],
  variable: '--font-body' 
})
const monoFont = JetBrains_Mono({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-mono' 
})

export const metadata: Metadata = {
  title: "Brier Protocol — The Intelligence Layer for Prediction Markets",
  description:
    "Deploy capital into verified quant bots. Every trade resolved by objective reality. The Bloomberg Terminal of Prediction Markets.",
};

import { FloatingBubbles } from "@/components/FloatingBubbles";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body 
        className="min-h-screen flex flex-col"
        style={{
          background: '#050505',
          color: '#FFFFFF',
          fontFamily: 'var(--font-body)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.015'/%3E%3C/svg%3E")`,
        }}
      >
        <Web3Provider>
          <Navbar />
          <FloatingBubbles />
          <main className="flex-1 relative z-10">{children}</main>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#0A0A0A",
                color: "#FFFFFF",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
                padding: "12px 24px",
              },
            }}
          />
        </Web3Provider>
      </body>
    </html>
  );
}
