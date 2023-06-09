import "./globals.css";
import { Inter, Abel, Exo_2, Montserrat } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const abel = Abel({
  subsets: ["latin"],
  weight: "400",
});
const exo2 = Exo_2({
  subsets: ["cyrillic"],
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Prompt Tester",
  description: "Rival AI Prompt Tester",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <html lang="en">
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <body className={montserrat.className}>{children}</body>
    </html>
  );
}
