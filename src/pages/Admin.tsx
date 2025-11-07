import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Admin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePopularHash = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('popular-hash-documentos');
      
      if (error) throw error;
      
      setResult(data);
      toast.success(`Processamento concluído! ${data.processados} documentos processados.`);
    } catch (error: any) {
      console.error('Erro ao popular hashes:', error);
      toast.error(error.message || 'Erro ao popular hashes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Administração</CardTitle>
          <CardDescription>
            Ferramentas administrativas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Popular Hashes de Documentos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Esta função calcula e popula os hashes SHA-256 para documentos existentes que ainda não possuem hash.
            </p>
            <Button onClick={handlePopularHash} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Executar Popular Hashes
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Resultado:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
