import type { Metadata } from "next";
import { Inter, Caveat, Dancing_Script, Kalam, Pacifico, Righteous, Bebas_Neue, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"]
});
const caveat = Caveat({ 
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "700"]
});
const dancingScript = Dancing_Script({ 
  subsets: ["latin"],
  variable: "--font-dancing",
  weight: ["400", "700"]
});
const kalam = Kalam({ 
  subsets: ["latin"],
  variable: "--font-kalam",
  weight: ["400", "700"]
});
const pacifico = Pacifico({ 
  subsets: ["latin"],
  variable: "--font-pacifico",
  weight: "400"
});
const righteous = Righteous({ 
  subsets: ["latin"],
  variable: "--font-righteous",
  weight: "400"
});
const bebasNeue = Bebas_Neue({ 
  subsets: ["latin"],
  variable: "--font-bebas",
  weight: "400"
});

export const metadata: Metadata = {
  title: "Trend Advisory Portal",
  description: "Financial planning tools and spending insights for Trend Advisory clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${manrope.variable} ${caveat.variable} ${dancingScript.variable} ${kalam.variable} ${pacifico.variable} ${righteous.variable} ${bebasNeue.variable}`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}