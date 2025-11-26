import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Package, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkQRPrint } from "@/components/products/BulkQRPrint";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  sale_price: number;
  status: string;
  image_url?: string;
  qr_code: string;
  barcode?: string | null;
  categories?: { id: string; name: string };
  suppliers?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadSuppliers(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          current_stock,
          minimum_stock,
          sale_price,
          status,
          image_url,
          qr_code,
          barcode,
          categories (id, name),
          suppliers (id, name)
        `)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
    }
  };

  const filteredProducts = products.filter((product) => {
    // Busca por nome
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Filtro por categoria
    const matchesCategory =
      selectedCategory === "all" ||
      product.categories?.id === selectedCategory;

    // Filtro por fornecedor
    const matchesSupplier =
      selectedSupplier === "all" ||
      product.suppliers?.id === selectedSupplier;

    // Filtro por status
    const matchesStatus =
      selectedStatus === "all" ||
      product.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesSupplier && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedSupplier("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedCategory !== "all" ||
    selectedSupplier !== "all" ||
    selectedStatus !== "all";

  const getStockBadge = (current: number, minimum: number) => {
    if (current === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    }
    if (current <= minimum) {
      return <Badge className="bg-warning text-warning-foreground">Estoque Baixo</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Em Estoque</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-primary/10 shadow-lg shadow-primary/10 bg-gradient-to-r from-primary/10 via-white to-accent/10">
          <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Catálogo
              </p>
              <h1 className="text-3xl font-semibold">Produtos</h1>
              <p className="text-muted-foreground">
                Gerencie seu catálogo de produtos ({filteredProducts.length} produtos visíveis)
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <BulkQRPrint products={filteredProducts} />
              <Button onClick={() => navigate("/products/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="p-4 shadow-md shadow-primary/5 border-primary/10 bg-white/80">
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros avançados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Lista de Produtos */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden hover:shadow-xl shadow-md border-primary/10 transition-all cursor-pointer rounded-2xl"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              {/* Imagem */}
              <div className="aspect-video bg-gradient-to-br from-muted via-white to-muted overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <Package className="h-10 w-10 opacity-40" />
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold line-clamp-2 flex-1">
                    {product.name}
                  </h3>
                  {getStockBadge(product.current_stock, product.minimum_stock)}
                </div>

                <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full">
                    {product.categories?.name || "Sem categoria"}
                  </Badge>
                  {product.suppliers && (
                    <Badge variant="outline" className="rounded-full">
                      {product.suppliers.name}
                    </Badge>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm">Estoque: {product.current_stock}</span>
                  <span className="font-semibold text-lg text-primary">
                    R$ {Number(product.sale_price).toFixed(2)}
                  </span>
                </div>

                {product.status === "inativo" && (
                  <Badge variant="secondary" className="w-full justify-center">
                    Inativo
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Estado Vazio */}
        {filteredProducts.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground space-y-4">
              <Package className="h-16 w-16 mx-auto opacity-50" />
              <div>
                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                {hasActiveFilters && (
                  <p className="text-sm">
                    Tente ajustar os filtros ou{" "}
                    <button
                      onClick={clearFilters}
                      className="text-primary hover:underline"
                    >
                      limpar todos os filtros
                    </button>
                  </p>
                )}
                {!hasActiveFilters && (
                  <Button
                    onClick={() => navigate("/products/new")}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Produto
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
