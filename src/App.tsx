import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LastFolderProvider } from "./contexts/LastFolderContext";
import { MainLayout } from "./components/layout/MainLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Perfil from "./pages/Perfil";
import Upload from "./pages/Upload";
import Documentos from "./pages/Documentos";
import Navegador from "./pages/Navegador";
import Entidades from "./pages/Entidades";
import Admin from "./pages/Admin";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/navegador" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <LastFolderProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
              <Route 
                path="/" 
                element={
                  <AuthenticatedRoute>
                    <Landing />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/auth" 
                element={
                  <AuthenticatedRoute>
                    <Auth />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/reset-password" 
                element={
                  <AuthenticatedRoute>
                    <ResetPasswordPage />
                  </AuthenticatedRoute>
                } 
              />
              <Route
                path="/navegador"
                element={
                  <ProtectedRoute>
                    <Navegador />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor"
                element={
                  <ProtectedRoute>
                    <Documentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/entidades"
                element={
                  <ProtectedRoute>
                    <Entidades />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </LastFolderProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
