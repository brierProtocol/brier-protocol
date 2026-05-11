import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
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
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#ededed]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#161616",
              color: "#ededed",
              border: "1px solid #333",
              fontFamily: "var(--font-dm-mono), monospace",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
