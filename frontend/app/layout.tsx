import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shark Odds",
  description: "Live betting signals with edge and EV in a clean, simple dashboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #113346 0%, #0a1821 50%, #05090d 100%)",
          color: "#f4fbff",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        {children}
      </body>
    </html>
  );
}
