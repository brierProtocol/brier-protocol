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
          background: '#050505',
          color: '#FFFFFF',
          fontFamily: 'var(--font-body)',
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
