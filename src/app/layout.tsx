import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://weeral.io"),
  title: {
    default: "Weeral — Cold email B2B automatisé",
    template: "%s | Weeral",
  },
  description:
    "Automatise tes campagnes de prospection B2B avec warmup automatique, rédaction IA et analytics en temps réel. Connecte Brevo, Mailgun, SendGrid ou AWS SES en 5 minutes.",
  keywords: [
    "cold email",
    "prospection B2B",
    "email warmup",
    "automation email",
    "emailing automatique",
    "Brevo",
    "Mailgun",
    "SendGrid",
    "AWS SES",
    "campagne email",
    "outreach B2B",
  ],
  authors: [{ name: "Weeral", url: "https://weeral.io" }],
  creator: "Weeral",
  publisher: "Weeral",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://weeral.io",
    siteName: "Weeral",
    title: "Weeral — Cold email B2B automatisé",
    description:
      "Automatise tes campagnes de prospection B2B avec warmup automatique, rédaction IA et analytics en temps réel.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Weeral — Cold email B2B automatisé",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weeral — Cold email B2B automatisé",
    description:
      "Automatise tes campagnes de prospection B2B avec warmup automatique et rédaction IA.",
    images: ["/og.png"],
  },
  alternates: {
    canonical: "https://weeral.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
