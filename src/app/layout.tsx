import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://ariajsarkar.github.io/PicEdit";

export const metadata: Metadata = {
  title: {
    default: "PicEdit - Free Online Image Tools",
    template: "%s | PicEdit",
  },
  description:
    "Free online image editing tools. Remove backgrounds with AI, compress images, resize, and convert formats. 100% private - all processing happens in your browser.",
  keywords: [
    "background remover",
    "remove background",
    "image editor",
    "online image tools",
    "compress image",
    "resize image",
    "convert image",
    "free image editor",
    "AI background removal",
    "no watermark",
    "privacy",
    "browser-based",
  ],
  authors: [{ name: "AriajSarkar", url: "https://github.com/AriajSarkar" }],
  creator: "AriajSarkar",
  publisher: "AriajSarkar",
  metadataBase: new URL(siteUrl),

  // Open Graph - for Facebook, LinkedIn, Discord, etc.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "PicEdit",
    title: "PicEdit - Free Online Image Tools",
    description:
      "Remove backgrounds with AI, compress, resize, and convert images. Free, private, no watermarks. All processing in your browser.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "PicEdit - Free Online Image Tools",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "PicEdit - Free Online Image Tools",
    description:
      "Remove backgrounds with AI, compress, resize, and convert images. Free, private, no watermarks.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@AriajSarkar",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // Manifest for PWA
  manifest: "/manifest.json",

  // Verification (add your own IDs later)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PicEdit",
              description:
                "Free online image editing tools. Remove backgrounds with AI, compress images, resize, and convert formats.",
              url: siteUrl,
              applicationCategory: "DesignApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Person",
                name: "AriajSarkar",
                url: "https://github.com/AriajSarkar",
              },
              featureList: [
                "AI Background Removal",
                "Image Compression",
                "Image Resizing",
                "Format Conversion",
                "100% Browser-based",
                "No Watermarks",
                "Free to Use",
              ],
            }),
          }}
        />
        {/* Enable Cross-Origin Isolation for WASM threads */}
        <script src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/coi-serviceworker.js`} async></script>
      </head>
      <body
        className={`${outfit.variable} ${firaCode.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
