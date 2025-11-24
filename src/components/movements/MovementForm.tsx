import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { movementSchema, MovementFormData } from "@/lib/validations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MovementFormProps {
  productId?: string;
  movementType?: "entrada" | "saida" | "ajuste" | "inventario";
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Product {
  id: string;
  name: string;
  current_stock: number;
}

export function MovementForm({
  productId,
  movementType,
  onSuccess,
  onCancel,
}: MovementFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: productId || "",
      type: movementType || "entrada",
      quantity: 1,
      reason: "",
    },
  });

  const watchedProductId = form.watch("product_id");
  const watchedType = form.watch("type");
  const watchedQuantity = form.watch("quantity");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (watchedProductId) {
      const product = products.find((p) => p.id === watchedProductId);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [watchedProductId, products]);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock")
        .eq("status", "ativo")
        .order("name");

      if (error) throw error;
      setProducts(data || []);

      // Se productId foi fornecido, carregar o produto específico
      if (productId) {
        const product = data?.find((p) => p.id === productId);
        setSelectedProduct(product || null);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const calculateNewStock = (): number | null => {
    if (!selectedProduct || !watchedQuantity) return null;

    const current = selectedProduct.current_stock;
    const quantity = watchedQuantity;

    switch (watchedType) {
      case "entrada":
        return current + quantity;
      case "saida":
        return current - quantity;
      case "ajuste":
      case "inventario":
        return quantity; // Quantidade representa o novo estoque
      default:
        return null;
    }
  };

  const newStock = calculateNewStock();
  const hasStockWarning =
    watchedType === "saida" &&
    selectedProduct &&
    watchedQuantity > selectedProduct.current_stock;

  const onSubmit = async (data: MovementFormData) => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    // Validar saída maior que estoque
    if (hasStockWarning) {
      toast.error("Quantidade de saída maior que estoque disponível");
      return;
    }

    setIsSubmitting(true);

    try {
      // Obter sessão do usuário
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const previousStock = selectedProduct.current_stock;
      const calculatedNewStock = calculateNewStock();

      if (calculatedNewStock === null) {
        toast.error("Erro ao calcular novo estoque");
        return;
      }

      // Criar movimentação
      const movementData = {
        product_id: data.product_id,
        user_id: session.user.id,
        type: data.type,
        quantity: data.quantity,
        previous_stock: previousStock,
        new_stock: calculatedNewStock,
        reason: data.reason || null,
      };

      const { error } = await supabase
        .from("stock_movements")
        .insert(movementData);

      if (error) throw error;

      toast.success("Movimentação registrada com sucesso!");
      form.reset();
      setSelectedProduct(null);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao registrar movimentação:", error);
      toast.error("Erro ao registrar movimentação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      entrada: "Entrada",
      saida: "Saída",
      ajuste: "Ajuste",
      inventario: "Inventário",
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Produto */}
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || !!productId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de Movimentação */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Movimentação *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || !!movementType}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste Manual</SelectItem>
                  <SelectItem value="inventario">Inventário</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {watchedType === "entrada" && "Adicionar produtos ao estoque"}
                {watchedType === "saida" && "Remover produtos do estoque"}
                {watchedType === "ajuste" && "Ajustar estoque manualmente"}
                {watchedType === "inventario" && "Definir estoque após contagem"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantidade */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchedType === "ajuste" || watchedType === "inventario"
                  ? "Novo Estoque *"
                  : "Quantidade *"}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 0)
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              {selectedProduct && (
                <FormDescription>
                  Estoque atual: {selectedProduct.current_stock}
                  {newStock !== null && (
                    <> → Novo estoque: <strong>{newStock}</strong></>
                  )}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Alerta de Estoque Insuficiente */}
        {hasStockWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Quantidade de saída ({watchedQuantity}) é maior que o estoque
              disponível ({selectedProduct?.current_stock || 0})
            </AlertDescription>
          </Alert>
        )}

        {/* Justificativa/Motivo */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Justificativa/Motivo
                {(watchedType === "ajuste" || watchedType === "inventario") && " *"}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o motivo da movimentação..."
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                {watchedType === "entrada" && "Ex: Compra, devolução, transferência"}
                {watchedType === "saida" && "Ex: Venda, perda, vencimento, transferência"}
                {watchedType === "ajuste" && "Obrigatório para ajustes manuais"}
                {watchedType === "inventario" && "Descreva o resultado do inventário"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex gap-4 justify-end pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || hasStockWarning}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar {getTypeLabel(watchedType)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
