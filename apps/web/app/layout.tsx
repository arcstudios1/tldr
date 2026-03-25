import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Gists — The news. In seconds.",
  description: "Curated news summaries across tech, finance, politics, culture, and sports. The stories that matter, distilled to their essentials.",
  openGraph: {
    title: "Gists — The news. In seconds.",
    description: "Curated news summaries across tech, finance, politics, culture, and sports.",
    type: "website",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem("gists-theme");if(t==="dark")document.documentElement.dataset.theme="dark";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
