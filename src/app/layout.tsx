import type { Metadata } from "next";
import { Syne, Inter, DM_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Providers } from "@/lib/providers";
import "./globals.css";

const displayFont = Syne({ 
  subsets: ['latin'], 
  weight: ['400', '600', '700', '800'],
  variable: '--font-display' 
})
const bodyFont = Inter({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600'],
  variable: '--font-body' 
})
const monoFont = DM_Mono({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500'],
  variable: '--font-mono' 
})

export const metadata: Metadata = {
  title: "Brier — The Intelligence Layer for Prediction Markets",
  description:
    "Deploy capital into verified quant bots. Every trade resolved by objective reality. The Bloomberg Terminal of Prediction Markets.",
};

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
          background: '#0A0A0A',
          color: '#efefef',
          fontFamily: 'var(--font-body), sans-serif',
        }}
      >
        <Providers>
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#181818",
                color: "#efefef",
                borderRadius: "6px",
                border: "1px solid #2a2a2a",
                fontFamily: 'var(--font-mono), monospace',
                fontSize: "12px",
                padding: "10px 18px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
