import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Folder, Link2, Search, Shield, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 border-b bg-white/70 backdrop-blur-sm sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-slate-900">DocTree</h1>
        <Button asChild className="bg-slate-900 text-white hover:bg-slate-700">
          <Link to="/auth">Entrar / Cadastrar</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="text-center py-20 max-w-3xl mx-auto px-4">
        <motion.h2
          className="text-4xl font-extrabold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Plataforma inteligente de gestão documental com análise por IA
        </motion.h2>
        <p className="text-lg text-slate-600 mb-8">
          Armazenamento universal, extração de entidades e estruturação automatizada de relacionamentos entre documentos.
        </p>
        <Button asChild size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Link to="/auth">Começar Agora</Link>
        </Button>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 px-8 py-16 max-w-6xl mx-auto">
        <FeatureCard
          icon={<FileText className="w-8 h-8 text-indigo-600" />}
          title="Armazenamento Universal de Documentos"
          text="Armazene e analise documentos de todos os tipos: Contratos, Atas, Certidões e muito mais. Compatível com PDF, OCR e múltiplos formatos."
        />
        <FeatureCard
          icon={<Brain className="w-8 h-8 text-indigo-600" />}
          title="Extração Inteligente de Entidades"
          text="IA avançada identifica e extrai entidades personalizadas — pessoas, imóveis, veículos, contas e mais. Totalmente configurável."
        />
        <FeatureCard
          icon={<Link2 className="w-8 h-8 text-indigo-600" />}
          title="Estrutura de Relacionamentos"
          text="Criação automática de redes entre documentos, pastas e entidades, permitindo navegação intuitiva e descoberta de conexões."
        />
        <FeatureCard
          icon={<Folder className="w-8 h-8 text-indigo-600" />}
          title="Organização por Pastas Temáticas"
          text="Agrupe documentos por temas, processos ou projetos com visualização completa das análises e entidades associadas."
        />
        <FeatureCard
          icon={<Search className="w-8 h-8 text-indigo-600" />}
          title="Busca Avançada e Navegação Inteligente"
          text="Localize rapidamente documentos, entidades e relacionamentos com filtros e pesquisa inteligente."
        />
        <FeatureCard
          icon={<Shield className="w-8 h-8 text-indigo-600" />}
          title="Segurança e Controle de Acesso"
          text="Camadas de segurança, criptografia e auditoria completa garantem controle e confidencialidade total."
        />
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 text-white text-center py-16">
        <h3 className="text-3xl font-semibold mb-4">Experimente o futuro da gestão documental</h3>
        <p className="mb-8 text-indigo-100">Conecte documentos, pessoas e organizações com o poder da IA.</p>
        <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50">
          <Link to="/auth">Acessar o DocTree</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} DocTree. Todos os direitos reservados.
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
}

function FeatureCard({ icon, title, text }: FeatureCardProps) {
  return (
    <Card className="shadow-md border border-slate-200">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-slate-600 text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}
