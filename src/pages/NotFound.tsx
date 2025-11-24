import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Erro 404</p>
          <h1 className="text-4xl font-semibold">Página não encontrada</h1>
          <p className="text-muted-foreground">
            O caminho <span className="font-mono text-foreground">{location.pathname}</span> não existe ou foi movido.
          </p>
          <Button asChild>
            <a href="/dashboard">Voltar para o dashboard</a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
