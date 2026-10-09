import type { Metadata } from "next";
import { Cinzel_Decorative, Jost } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel_Decorative({ variable: "--font-cinzel", subsets: ["latin"], weight: ["400", "700"] });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apólices não Renovadas · Piaseg",
  description: "Acompanhamento das apólices não renovadas por franqueado",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${jost.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
