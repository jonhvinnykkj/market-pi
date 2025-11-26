import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductFormData } from "@/lib/validations";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeDisplay } from "@/components/shared/QRCodeDisplay";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { id?: string; qr_code?: string };
  onSuccess?: (productId: string) => void;
  onCancel?: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export function ProductForm({
  initialData,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<{ id: string; name: string; qr_code: string } | null>(null);
  const isEditing = !!initialData?.id;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      barcode: initialData?.barcode || "",
      category_id: initialData?.category_id || "",
      supplier_id: initialData?.supplier_id || "",
      cost_price: initialData?.cost_price || 0,
      sale_price: initialData?.sale_price || 0,
      current_stock: initialData?.current_stock || 0,
      minimum_stock: initialData?.minimum_stock || 0,
      location: initialData?.location || "",
      expiration_date: initialData?.expiration_date || "",
      batch_number: initialData?.batch_number || "",
      status: initialData?.status || "ativo",
      image_url: initialData?.image_url || "",
    },
  });

  // Carregar categorias e fornecedores
  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias");
      return;
    }

    setCategories(data || []);
  };

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Erro ao carregar fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
      return;
    }

    setSuppliers(data || []);
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);

    try {
      // Gerar QR Code único (se criando novo produto)
      const qrCode = isEditing
        ? initialData?.qr_code
        : crypto.randomUUID();

      // Gerar código de barras EAN-13 automaticamente (se criando novo produto)
      const generateBarcode = () => {
        // Gera 12 dígitos aleatórios (o 13º é o dígito verificador)
        const randomDigits = Array.from({ length: 12 }, () =>
          Math.floor(Math.random() * 10)
        ).join('');

        // Calcula o dígito verificador EAN-13
        const sum = randomDigits.split('').reduce((acc, digit, index) => {
          const multiplier = index % 2 === 0 ? 1 : 3;
          return acc + parseInt(digit) * multiplier;
        }, 0);

        const checkDigit = (10 - (sum % 10)) % 10;
        return randomDigits + checkDigit;
      };

      const barcode = isEditing
        ? (data.barcode || initialData?.barcode)
        : (data.barcode || generateBarcode());

      const productData = {
        ...data,
        image_url: data.image_url || null,
        qr_code: qrCode,
        barcode: barcode,
        // Converter campos vazios para null
        description: data.description || null,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        location: data.location || null,
        expiration_date: data.expiration_date || null,
        batch_number: data.batch_number || null,
      };

      if (isEditing) {
        // Atualizar produto existente
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", initialData.id);

        if (error) throw error;

        toast.success("Produto atualizado com sucesso!");
        onSuccess?.(initialData.id!);
      } else {
        // Criar novo produto
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        // Mostrar modal com QR Code
        setCreatedProduct({
          id: newProduct.id,
          name: data.name,
          qr_code: qrCode!,
        });
        setShowQRCodeModal(true);
        toast.success("Produto criado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error(
        isEditing
          ? "Erro ao atualizar produto"
          : "Erro ao criar produto"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome do Produto *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Arroz Branco 5kg"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição detalhada do produto..."
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Código de Barras - Gerado Automaticamente */}
          {isEditing && initialData?.barcode && (
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Barras (Gerado Automaticamente)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormDescription>
                    Código gerado automaticamente ao criar o produto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Categoria */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fornecedor */}
          <FormField
            control={form.control}
            name="supplier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preço de Custo */}
          <FormField
            control={form.control}
            name="cost_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Custo (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preço de Venda */}
          <FormField
            control={form.control}
            name="sale_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Venda (R$) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estoque Atual */}
          <FormField
            control={form.control}
            name="current_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Atual</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Quantidade atual em estoque
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estoque Mínimo */}
          <FormField
            control={form.control}
            name="minimum_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Mínimo</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Alerta quando atingir este valor
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Localização */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localização no Estoque</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Corredor 3, Prateleira A"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Validade */}
          <FormField
            control={form.control}
            name="expiration_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Validade</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Número do Lote */}
          <FormField
            control={form.control}
            name="batch_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número do Lote</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: L123456"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões de Ação */}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Atualizar Produto" : "Criar Produto"}
          </Button>
        </div>
      </form>

      {/* Modal de QR Code após criação */}
      <Dialog open={showQRCodeModal} onOpenChange={setShowQRCodeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Produto Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              O QR Code do produto foi gerado automaticamente. Você pode imprimir ou baixar agora.
            </DialogDescription>
          </DialogHeader>

          {createdProduct && (
            <div className="py-4">
              <QRCodeDisplay
                value={createdProduct.qr_code}
                title={createdProduct.name}
                size={200}
                showActions={true}
              />
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowQRCodeModal(false);
                if (createdProduct) {
                  onSuccess?.(createdProduct.id);
                }
              }}
            >
              Ver Detalhes do Produto
            </Button>
            <Button
              onClick={() => {
                setShowQRCodeModal(false);
                form.reset();
                setCreatedProduct(null);
              }}
            >
              Criar Outro Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
