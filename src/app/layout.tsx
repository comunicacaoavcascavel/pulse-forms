import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.FORMS_ZALEN_BASE_URL || "https://forms.zalen.tech"),
  title: "Forms Zalen",
  description: "Formulários multi-tenant para empresas, igrejas e operações.",
  applicationName: "Forms Zalen",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/brand/zalen-icon.svg",
    shortcut: "/brand/zalen-icon.svg",
    apple: "/brand/zalen-icon.svg",
  },
  openGraph: {
    title: "Forms Zalen",
    description: "Formulários multi-tenant para empresas, igrejas e operações.",
    url: "/",
    siteName: "Forms Zalen",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/brand/forms-zalen-og.png",
        width: 1200,
        height: 630,
        alt: "Forms Zalen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forms Zalen",
    description: "Formulários multi-tenant para empresas, igrejas e operações.",
    images: ["/brand/forms-zalen-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
