import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AuthPage } from "@/components/auth/AuthPage";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/navegador");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <AuthPage />;
}
