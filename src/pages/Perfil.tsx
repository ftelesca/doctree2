import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Perfil = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    // SEO: title, meta description, canonical
    document.title = "Perfil do Usuário | DocTree";

    const desc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    desc.setAttribute("name", "description");
    desc.setAttribute("content", "Perfil do usuário no DocTree: dados da conta e informações da empresa.");
    if (!desc.parentNode) document.head.appendChild(desc);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", `${window.location.origin}/perfil`);
    if (!canonical.parentNode) document.head.appendChild(canonical);
  }, []);

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
      </header>

      <main className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Informações básicas da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.foto_url} alt={profile?.nome || user?.email || "Usuário"} />
                <AvatarFallback>{getInitials(profile?.nome || user?.email)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-medium text-foreground">{profile?.nome || user?.email}</p>
                {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                {profile?.organizacoes?.nome && (
                  <p className="text-sm text-muted-foreground">Organização: {profile.organizacoes.nome}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Perfil;
