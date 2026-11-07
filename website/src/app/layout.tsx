import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Agentation } from "agentation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CumulusFit | Reach a little higher",
  description: "Elevate your strength training with CumulusFit. Personalized AI workouts, flexible routines, and every set saved in the cloud.",
  applicationName: "CumulusFit",
  // Home screen app on iPhone: full screen, with the app's own name.
  appleWebApp: {
    capable: true,
    title: "CumulusFit",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f1f5fa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
