import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Web3Provider } from "@/providers/web3";
import "./globals.css";
import "@/styles/design-tokens.css";

const syne = Syne({ 
  subsets: ['latin'], 
  weight: ['700', '800'],
  variable: '--font-display' 
})
const dmSans = DM_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600'],
  variable: '--font-body' 
})
const jetbrainsMono = JetBrains_Mono({ 
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
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body 
        className="min-h-screen flex flex-col"
        style={{
          background: '#080808',
          color: '#F5F5F0',
          fontFamily: 'var(--font-body)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
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
                background: "#080808",
                color: "#F5F5F0",
                borderRadius: "999px",
                border: "0.5px solid rgba(255,255,255,0.1)",
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
