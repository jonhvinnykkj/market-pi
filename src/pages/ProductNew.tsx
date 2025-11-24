import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProductForm } from "@/components/products/ProductForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export default function ProductNew() {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleSuccess = (productId: string) => {
    // Redirecionar para a página de detalhes do produto criado
    navigate(`/products/${productId}`);
  };

  const handleCancel = () => {
    navigate("/products");
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/products")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Catálogo
              </p>
              <h1 className="text-3xl font-semibold">Novo produto</h1>
              <p className="text-muted-foreground">
                Preencha as informações para publicar um item com QR Code automático.
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <Card className="border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>
              Campos marcados com * são obrigatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
