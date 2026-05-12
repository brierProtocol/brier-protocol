import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Web3Provider } from "@/providers/web3";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

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
      className={`${syne.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        <Web3Provider>
          <Navbar />
          <FloatingBubbles />
          <main className="flex-1">{children}</main>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#0A0A0A",
                color: "#FFFFFF",
                borderRadius: "999px",
                fontFamily: "var(--font-dm-mono), monospace",
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
