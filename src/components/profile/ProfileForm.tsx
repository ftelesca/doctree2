import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Loader2 } from "lucide-react";

interface ProfileFormProps {
  onClose: () => void;
}

export function ProfileForm({ onClose }: ProfileFormProps) {
  const { user, profile, updateProfile } = useAuth();
  const [nome, setNome] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || "");
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ nome });
      onClose();
    } catch (error) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.foto_url} alt={nome} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">{getInitials(nome)}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Foto do perfil será sincronizada automaticamente com sua conta Google
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" value={user?.email || ""} className="pl-10 bg-muted/50" disabled />
          </div>
          <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </div>
    </form>
  );
}
