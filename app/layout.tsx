import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PaletteProvider, PALETTE_SCRIPT } from "@/components/palette-provider";
import { SakuraDecor } from "@/components/sakura-decor";
import { getClientMigrationScript } from "@/lib/client-migrations";
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
  title: "NTCBC Signups",
  description: "Sign-ups for NTCBC Programs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Migrations must run before the palette is read — keep them in one script. */}
        <Script
          id="client-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `${getClientMigrationScript()};${PALETTE_SCRIPT}` }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "system"]}
          value={{
            light: "light",
            dark: "dark",
          }}
          disableTransitionOnChange
        >
          <PaletteProvider>
            <div className="min-h-screen bg-background">
              <SakuraDecor />
              <div className="container mx-auto px-4 py-8">{children}</div>
            </div>
            <Toaster />
          </PaletteProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
