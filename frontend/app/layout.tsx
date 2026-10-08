import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

const spaceGroteskHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Court Order & Payment Agreement Defaulter App",
  description: "Monitor court-ordered debt payments, detect defaults, and calculate deterministic amounts owed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        spaceGroteskHeading.variable
      )}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t py-6 bg-muted/30 text-center text-xs text-muted-foreground">
            <div className="max-w-7xl mx-auto px-4">
              Court Order & Payment Agreement Defaulter Tracking System • Deterministic Calculation Engine
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
