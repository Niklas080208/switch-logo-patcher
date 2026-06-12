import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Switch Logo Patcher",
  description:
    "Erzeuge IPS-Patches, um das Bootlogo der Nintendo Switch durch ein eigenes Bild zu ersetzen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
