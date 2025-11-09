import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import docTreeIcon from "@/assets/doctree-icon.svg";

export function AuthPage() {
  const [currentTab, setCurrentTab] = useState<"login" | "signup" | "forgot">("login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={docTreeIcon} alt="DocTree" className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">DocTree</h1>
            <p className="text-muted-foreground">Documentos Conectados</p>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {currentTab === "login" && "Entrar na sua conta"}
              {currentTab === "signup" && "Criar nova conta"}
              {currentTab === "forgot" && "Recuperar senha"}
            </CardTitle>
            <CardDescription>
              {currentTab === "login" && "Acesse sua plataforma"}
              {currentTab === "signup" && "Comece a organizar seus documentos hoje"}
              {currentTab === "forgot" && "Enviaremos um link para redefinir sua senha"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentTab === "login" && (
              <LoginForm onSwitchToSignUp={() => setCurrentTab("signup")} onSwitchToForgot={() => setCurrentTab("forgot")} />
            )}
            {currentTab === "signup" && <SignUpForm onSwitchToLogin={() => setCurrentTab("login")} />}
            {currentTab === "forgot" && <ForgotPasswordForm onSwitchToLogin={() => setCurrentTab("login")} />}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 DocTree. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
