import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { RaidProvider } from "@/features/template/RaidContext";
import { GoogleDriveProvider } from "@/features/template/GoogleDriveContext";
import GroupNameHeader from "@/components/layout/GroupNameHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TTemplate - ESO Raid Tool",
  description: "Organize your ESO raid teams",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleDriveProvider>
          <RaidProvider>
            <GroupNameHeader />
            {children}
          </RaidProvider>
        </GoogleDriveProvider>
      </body>
    </html>
  );
}
