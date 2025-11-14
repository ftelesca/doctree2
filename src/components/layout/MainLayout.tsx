import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { PendingSharesDialog } from "@/components/navegador/PendingSharesDialog";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      
      {/* Main Content */}
      <main className="flex-1 container py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DocTree. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Termos</button>
            <button className="hover:text-foreground transition-colors">Privacidade</button>
            <button className="hover:text-foreground transition-colors">Suporte</button>
          </div>
        </div>
      </footer>

      {/* Dialog de Compartilhamentos Pendentes */}
      <PendingSharesDialog />
    </div>
  );
}