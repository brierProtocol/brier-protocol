import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRIER_TERMINAL // Prediction Protocol",
  description: "Terminal interface for Brier Protocol. Predictive market infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased cursor-default">
      <body 
        className="min-h-screen flex flex-col bg-[#030303]"
        style={{
          background: '#030303',
          color: '#e8e8e8',
        }}
      >
        <Providers>
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#080405",
                color: "#ff2a4d",
                borderRadius: "0px",
                border: "1px solid #ff2a4d",
                fontFamily: 'var(--font-mono), monospace',
                fontSize: "12px",
                padding: "10px 18px",
                boxShadow: "0 0 15px rgba(255, 42, 77, 0.15)",
                textTransform: 'uppercase'
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
