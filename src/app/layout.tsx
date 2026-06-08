import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Weeral — Cold email B2B automatisé",
    description:
      "Automatise tes campagnes de prospection B2B avec warmup automatique et rédaction IA.",
  },
  alternates: {
    canonical: "https://weeral.io",
  },
  other: {
    "llms-txt": "https://weeral.io/llms.txt",
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
      <body className="min-h-full flex flex-col">
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Weeral',
          url: 'https://weeral.io',
          description: 'SaaS de cold email B2B avec warmup automatique, rédaction IA et BYOA (Brevo, Mailgun, SendGrid, AWS SES).',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://weeral.io/?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }} />
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Weeral',
          url: 'https://weeral.io',
          logo: 'https://weeral.io/opengraph-image',
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'hello@weeral.co',
            contactType: 'customer support',
            availableLanguage: 'French',
          },
          sameAs: [],
        }} />
        {children}
      </body>
    </html>
  );
}
