import { Moon, Sun, LogOut, User, Info, FileText, Upload, BarChart3, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { NavLink } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Building2, Home, Users, Calendar, BookOpen, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import docTreeIcon from "@/assets/doctree-icon.svg";

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const menuItems = [
    { title: "Navegador", url: "/", icon: BookOpen },
    { title: "Editor", url: "/editor", icon: Calendar },
    { title: "Administrador", url: "/entidades", icon: Tag, adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <img src={docTreeIcon} alt="DocTree" className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-bold text-primary">DocTree</h1>
          <p className="text-xs text-muted-foreground">Documentos Conectados</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}

        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Info className="h-4 w-4" />
              <span>Sobre</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Info className="h-6 w-6 text-primary" />
                Sobre o DocTree
              </DialogTitle>
              <DialogDescription>
                Plataforma inteligente de gestão documental com análise por IA e estruturação automatizada de
                relacionamentos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Armazenamento Universal de Documentos</h3>
                    <p className="text-sm text-muted-foreground">
                      Armazene e analise documentos de todos os tipos:{" "}
                      <strong>Contratos, Atas, Processos, Extratos, Certidões, Escrituras</strong> e muito mais. Sistema
                      compatível com PDF, documentos escaneados (OCR) e múltiplos formatos, organizados de forma
                      inteligente e segura.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Extração Inteligente de Entidades Configuráveis</h3>
                    <p className="text-sm text-muted-foreground">
                      IA avançada processa automaticamente seus documentos identificando e extraindo entidades
                      personalizadas conforme sua necessidade:{" "}
                      <strong>Organizações, Pessoas, Imóveis, Veículos, Contas Bancárias</strong> e outros tipos de
                      entidades relevantes para seu negócio. Sistema totalmente configurável pelo usuário.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Estrutura de Relacionamentos Automatizada</h3>
                    <p className="text-sm text-muted-foreground">
                      O sistema cria automaticamente uma rede de relacionamentos entre{" "}
                      <strong>documentos, pastas temáticas e entidades</strong>, permitindo navegação intuitiva e
                      descoberta de conexões. Visualize como pessoas, organizações e ativos se relacionam através dos
                      documentos processados.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Organização por Pastas Temáticas</h3>
                    <p className="text-sm text-muted-foreground">
                      Agrupe documentos em <strong>pastas temáticas personalizadas</strong> para organizar processos,
                      projetos ou assuntos específicos. Acesse rapidamente toda a documentação relacionada a um tema,
                      com visualização completa das análises e entidades associadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Busca Avançada e Navegação Inteligente</h3>
                    <p className="text-sm text-muted-foreground">
                      Sistema de <strong>busca e filtragem avançada</strong> permite localizar rapidamente documentos,
                      entidades e relacionamentos. Navegue pela estrutura completa com filtros por tipo de entidade,
                      período, pasta ou qualquer atributo extraído pela IA.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Upload className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Conciliação e Auditoria</h3>
                    <p className="text-sm text-muted-foreground">
                      Ferramentas de <strong>conciliação automatizada</strong> identificam inconsistências, duplicidades
                      e relacionamentos entre documentos e entidades. Rastreie a origem de cada informação com auditoria
                      completa do processamento.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">Segurança e Controle de Acesso</h3>
                    <p className="text-sm text-muted-foreground">
                      <strong>Segurança em múltiplas camadas</strong> com controle de acesso por organização,
                      criptografia de dados sensíveis e rastreamento completo de todas as operações. Cada usuário acessa
                      apenas os documentos e informações autorizadas para sua organização.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </nav>

      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-3 hover:bg-muted rounded-lg p-2 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.foto_url} alt={profile?.nome} />
                <AvatarFallback>{profile?.nome ? getInitials(profile.nome) : "?"}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium">{profile?.nome || user?.email}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => navigate("/perfil")}
              className="data-[highlighted]:bg-muted data-[highlighted]:text-foreground focus:bg-muted focus:text-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Minha Conta</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="data-[highlighted]:bg-muted data-[highlighted]:text-foreground focus:bg-muted focus:text-foreground"
            >
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span>Alternar tema</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive data-[highlighted]:bg-muted data-[highlighted]:text-foreground focus:bg-muted focus:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
