import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  MapPin,
  Calendar,
  Hash,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/components/shared/QRCodeDisplay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layout } from "@/components/Layout";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        .select(
          `
          *,
          categories (id, name),
          suppliers (id, name)
        `
        )
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      navigate("/products");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
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

  const getStockStatus = () => {
    if (product.current_stock === 0) {
      return { label: "Sem Estoque", variant: "destructive" as const };
    }
    if (product.current_stock <= product.minimum_stock) {
      return { label: "Estoque Baixo", variant: "warning" as const };
    }
    return { label: "Em Estoque", variant: "success" as const };
  };

  const stockStatus = getStockStatus();
  const marginPercent = product.sale_price > 0
    ? (((product.sale_price - product.cost_price) / product.sale_price) * 100).toFixed(2)
    : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-2 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/products")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold">{product.name}</h1>
                <Badge variant={product.status === "ativo" ? "default" : "secondary"}>
                  {product.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
              </div>
              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate(`/products/${id}/edit`)}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Imagem do Produto */}
            {product.image_url && (
              <Card className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5">
                <CardContent className="p-0">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full aspect-video object-cover"
                  />
                </CardContent>
              </Card>
            )}

            {/* Informações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">
                    {product.categories?.name || "Não definida"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">
                    {product.suppliers?.name || "Não definido"}
                  </p>
                </div>
                {product.barcode && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      Código de Barras
                    </p>
                    <p className="font-mono font-medium">{product.barcode}</p>
                  </div>
                )}
                {product.location && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Localização
                    </p>
                    <p className="font-medium">{product.location}</p>
                  </div>
                )}
                {product.batch_number && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Lote</p>
                    <p className="font-medium">{product.batch_number}</p>
                  </div>
                )}
                {product.expiration_date && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Validade
                    </p>
                    <p className="font-medium">
                      {new Date(product.expiration_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estoque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Controle de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Estoque Atual</p>
                    <p className="text-2xl font-bold">{product.current_stock}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                    <p className="text-2xl font-bold">{product.minimum_stock}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/movements", { state: { productId: id, type: "entrada" } })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Entrada
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/movements", { state: { productId: id, type: "saida" } })}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Saída
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Preços e Margem
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Preço de Custo</p>
                  <p className="text-xl font-bold">
                    R$ {Number(product.cost_price).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Preço de Venda</p>
                  <p className="text-xl font-bold text-success">
                    R$ {Number(product.sale_price).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Margem</p>
                  <p className="text-xl font-bold text-info">
                    {marginPercent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - QR Code */}
          <div className="space-y-6">
            <QRCodeDisplay
              value={product.qr_code}
              title="QR Code do Produto"
              subtitle={product.name}
              size={250}
            />
          </div>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o produto "{product.name}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
