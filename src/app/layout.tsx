import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import DisclaimerBar from "@/components/layout/DisclaimerBar";
import AmbientDots from "@/components/AmbientDots";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://brier-protocol.vercel.app"),
  title: {
    default: "BRIER // Prediction Market Protocol",
    template: "%s // BRIER",
  },
  description:
    "Non-custodial vaults for algorithmic prediction-market bots. Ranked by Brier Score, traded on Polymarket. Deposit, deploy, and earn.",
  keywords: ["prediction markets", "Polymarket", "Brier Score", "trading bots", "DeFi vaults", "market making"],
  applicationName: "Brier Protocol",
  openGraph: {
    title: "BRIER // Prediction Market Protocol",
    description:
      "Non-custodial vaults for algorithmic prediction-market bots. Ranked by Brier Score, traded on Polymarket.",
    type: "website",
    siteName: "Brier Protocol",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRIER // Prediction Market Protocol",
    description: "Non-custodial vaults for algorithmic prediction-market bots.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
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
          <AmbientDots />
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <DisclaimerBar />
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
