import type { Metadata } from "next";
import { Geist, Geist_Mono, Google_Sans, Pixelify_Sans, Tiny5 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Az alkalmazás pixeles betűi; a dokumentáció marad a Geistnél.
const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin", "latin-ext"],
});

// Olvasható, nem pixeles szövegbetű a beviteli mezőkhöz és a hosszabb magyarázatokhoz.
const read = Google_Sans({
  variable: "--font-read",
  subsets: ["latin", "latin-ext"],
});

const tiny = Tiny5({
  variable: "--font-tiny",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "MineScript",
  description: "Program a treasure-hunting robot in MineScript",
};

// A gyökér statikus marad (a dokumentáció előrenderelt), ezért itt nem olvassuk a nyelvi sütit.
// A tényleges nyelvet az alkalmazás oldalain az I18nProvider, a dokumentációban a docs layout jelöli (lang).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} ${read.variable} ${tiny.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
