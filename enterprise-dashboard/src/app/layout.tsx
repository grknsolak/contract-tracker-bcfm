import "./globals.css";
import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ContractsProvider } from "@/features/contracts/context/contracts-store";
import type { ReactNode } from "react";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Contract Tracker",
  description: "Contract lifecycle management for internal operations teams"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sourceSerif.variable} font-sans`}>
        <ThemeProvider>
          <QueryProvider>
            <ContractsProvider>{children}</ContractsProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
