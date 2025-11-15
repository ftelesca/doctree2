import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";

interface LoginFormProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgot: () => void;
}

export function LoginForm({ onSwitchToSignUp, onSwitchToForgot }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  const { signIn, signInWithGoogle, resendVerificationEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResendVerification(false);

    try {
      await signIn(email, password, rememberMe);
    } catch (error: any) {
      if (error.code === "email_not_confirmed") {
        setShowResendVerification(true);
        setResendEmail(error.email || email);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setIsGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail(resendEmail);
      setShowResendVerification(false);
    } catch (error) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Verification Resend */}
      {showResendVerification && (
        <div className="p-4 bg-warning/10 border border-warning rounded-md space-y-2">
          <p className="text-sm text-warning">Email não confirmado</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            className="w-full"
          >
            Reenviar email de verificação
          </Button>
        </div>
      )}

      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-base font-medium"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
        ) : (
          <GoogleIcon className="h-5 w-5 mr-3" />
        )}
        Entrar com Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou continue com email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="pl-10 pr-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading || isGoogleLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading || isGoogleLoading}
            />
            <Label 
              htmlFor="remember" 
              className="text-sm font-normal cursor-pointer"
            >
              Manter conectado
            </Label>
          </div>
          <Button
            type="button"
            variant="link"
            className="px-0 text-sm h-auto"
            onClick={onSwitchToForgot}
            disabled={isLoading || isGoogleLoading}
          >
            Esqueceu sua senha?
          </Button>
        </div>

        <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading || isGoogleLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <div className="text-center">
        <span className="text-sm text-muted-foreground">Não tem uma conta? </span>
        <Button
          type="button"
          variant="link"
          className="px-0 text-sm font-medium"
          onClick={onSwitchToSignUp}
          disabled={isLoading || isGoogleLoading}
        >
          Criar conta
        </Button>
      </div>
    </div>
  );
}
