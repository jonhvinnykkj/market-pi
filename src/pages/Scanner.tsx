import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRScanner } from "@/components/scanner/QRScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package,
  DollarSign,
  ArrowRight,
  Plus,
  Minus,
  Eye,
  Info,
} from "lucide-react";

interface ScannedProduct {
  id: string;
  name: string;
  description: string | null;
  current_stock: number;
  minimum_stock: number;
  sale_price: number;
  cost_price: number;
  status: string;
  image_url: string | null;
  categories?: { name: string };
  suppliers?: { name: string };
}

export default function Scanner() {
  const navigate = useNavigate();
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleScan = async (qrCode: string) => {
    setIsLoadingProduct(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name),
          suppliers (name)
        `)
        .eq("qr_code", qrCode)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Produto não encontrado", {
            description: "Este QR Code não está cadastrado no sistema",
          });
        } else {
          throw error;
        }
        setScannedProduct(null);
        return;
      }

      setScannedProduct(data);
      toast.success("Produto encontrado!", {
        description: data.name,
      });
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      toast.error("Erro ao buscar produto");
      setScannedProduct(null);
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleError = (errorMessage: string) => {
    console.error("Scanner error:", errorMessage);
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) {
      return { label: "Sem Estoque", variant: "destructive" as const };
    }
    if (current <= minimum) {
      return { label: "Estoque Baixo", variant: "warning" as const };
    }
    return { label: "Em Estoque", variant: "success" as const };
  };

  const stockStatus = scannedProduct
    ? getStockStatus(scannedProduct.current_stock, scannedProduct.minimum_stock)
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Scanner QR Code</h1>
          <p className="text-muted-foreground">
            Escaneie produtos para consulta rápida e movimentações
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Scanner */}
          <div className="space-y-4">
            <QRScanner onScan={handleScan} onError={handleError} />

            {/* Card de Instruções */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Funcionalidades
                </CardTitle>
                <CardDescription>O que você pode fazer com o scanner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Consulta rápida de informações do produto</li>
                    <li>Registro de entrada/saída de estoque</li>
                    <li>Verificação de validade e lote</li>
                    <li>Acesso direto aos detalhes completos</li>
                  </ul>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-semibold text-sm">Dicas:</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Mantenha o código QR limpo e visível</li>
                    <li>Use boa iluminação para melhor leitura</li>
                    <li>Posicione o QR Code dentro da área marcada</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultado do Scan */}
          <div>
            {isLoadingProduct && (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
                  <p>Buscando produto...</p>
                </div>
              </Card>
            )}

            {!isLoadingProduct && !scannedProduct && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground space-y-3">
                  <Package className="h-16 w-16 mx-auto opacity-50" />
                  <div>
                    <p className="text-lg font-medium">Nenhum produto escaneado</p>
                    <p className="text-sm">
                      Ative o scanner e aponte para um QR Code
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {!isLoadingProduct && scannedProduct && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {scannedProduct.name}
                      </CardTitle>
                      {scannedProduct.description && (
                        <CardDescription className="text-sm">
                          {scannedProduct.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {stockStatus && (
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      )}
                      <Badge variant={scannedProduct.status === "ativo" ? "default" : "secondary"}>
                        {scannedProduct.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {scannedProduct.image_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={scannedProduct.image_url}
                      alt={scannedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <CardContent className="space-y-6 pt-6">
                  {/* Informações Gerais */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <p className="font-medium">
                        {scannedProduct.categories?.name || "Não definida"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fornecedor</p>
                      <p className="font-medium">
                        {scannedProduct.suppliers?.name || "Não definido"}
                      </p>
                    </div>
                  </div>

                  {/* Estoque */}
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Estoque</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-3xl font-bold">
                          {scannedProduct.current_stock}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mínimo: {scannedProduct.minimum_stock}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preços */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Preço de Custo
                      </p>
                      <p className="text-xl font-bold">
                        R$ {scannedProduct.cost_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Preço de Venda
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        R$ {scannedProduct.sale_price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-2 pt-4 border-t">
                    <Button
                      onClick={() => navigate(`/products/${scannedProduct.id}`)}
                      className="w-full"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes Completos
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => navigate("/movements", {
                          state: { productId: scannedProduct.id, type: "entrada" }
                        })}
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Entrada
                      </Button>
                      <Button
                        onClick={() => navigate("/movements", {
                          state: { productId: scannedProduct.id, type: "saida" }
                        })}
                        variant="outline"
                      >
                        <Minus className="mr-2 h-4 w-4" />
                        Saída
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
