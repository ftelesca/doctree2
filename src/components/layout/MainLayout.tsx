import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Settings, FolderTree, Upload, Database, Home } from "lucide-react";
import { PendingSharesDialog } from "@/components/navegador/PendingSharesDialog";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <FolderTree className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">DocTree</span>
            </div>

            {/* Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant={isActive("/") ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Início
                </Button>
                <Button
                  variant={isActive("/navegador") ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/navegador")}
                  className="gap-2"
                >
                  <FolderTree className="h-4 w-4" />
                  Navegador
                </Button>
                <Button
                  variant={isActive("/upload") ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/upload")}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar
                </Button>
                <Button
                  variant={isActive("/cadastros") ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/cadastros")}
                  className="gap-2"
                >
                  <Database className="h-4 w-4" />
                  Cadastros
                </Button>
              </nav>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Minha Conta</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

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