import type { Metadata } from "next";
import "./globals.css";
import { Header } from "./components/navigation/Header";
import { ToastProvider } from "./components/ui/toast";

export const metadata: Metadata = {
  title: "CajuSpace",
  description: "Gestão de espaços e reservas inteligente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <Header />
          <main className="pt-24 pb-10">
            <div className="cj-container">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
