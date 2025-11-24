import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProductForm } from "@/components/products/ProductForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    if (id) {
      loadProduct();
    }
  }, [id]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProduct = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Produto não encontrado");
        navigate("/products");
        return;
      }

      setProduct(data);
    } catch (error) {
      console.error("Erro ao carregar produto:", error);
      toast.error("Erro ao carregar produto");
      navigate("/products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (productId: string) => {
    // Redirecionar para a página de detalhes
    navigate(`/products/${productId}`);
  };

  const handleCancel = () => {
    navigate(`/products/${id}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-2 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/products/${id}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Catálogo</p>
            <h1 className="text-3xl font-semibold">Editar produto</h1>
            <p className="text-muted-foreground">{product.name}</p>
          </div>
        </div>

        {/* Formulário */}
        <Card className="border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>
              Atualize as informações do produto abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm
              initialData={product}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
