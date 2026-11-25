import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { brand } from "@/config/brand";
import "./globals.css";

// V5 design (D91): Manrope for body text, Outfit for headings. Both are variable fonts, so no weight list is needed.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — Career discovery & learning`,
    template: `%s · ${brand.name}`,
  },
  description: `${brand.name} is the complete career development and learning platform. Discover your path with ${brand.guideName}, your career guide, then learn the skills to get there.`,
};

export const viewport: Viewport = {
  // Matches the `paper` token (theme colour must be a literal here).
  themeColor: "#fbf8f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
