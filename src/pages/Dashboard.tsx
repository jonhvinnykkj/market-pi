import { useEffect, useState, ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, TrendingDown, DollarSign, ArrowUpIcon, ArrowDownIcon, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CategoryData {
  name: string;
  value: number;
  products: number;
}

interface MovementData {
  date: string;
  entradas: number;
  saidas: number;
}

interface LowStockProduct {
  name: string;
  current_stock: number;
  minimum_stock: number;
}

type CategoryProductRow = {
  current_stock: number;
  cost_price: number;
  categories?: { name?: string | null } | null;
};

type MovementRow = {
  type: "entrada" | "saida" | string;
  quantity: number;
  created_at: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin, profile } = useUserRole();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    nearExpiration: 0,
    totalValue: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  useEffect(() => {
    checkAuth();
    loadAllData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadCategoryData(),
        loadMovementData(),
        loadLowStockProducts(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Total de produtos
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      // Produtos com estoque baixo
      const { data: lowStockData } = await supabase
        .from("products")
        .select("current_stock, minimum_stock")
        .eq("status", "ativo");

      const lowStock = lowStockData?.filter(
        (p) => p.current_stock <= p.minimum_stock
      ).length || 0;

      // Produtos próximos ao vencimento (30 dias)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { count: nearExpiration } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo")
        .not("expiration_date", "is", null)
        .lte("expiration_date", thirtyDaysFromNow.toISOString());

      // Valor total do estoque
      const { data: products } = await supabase
        .from("products")
        .select("current_stock, cost_price")
        .eq("status", "ativo");

      const totalValue = products?.reduce(
        (acc, product) => acc + (product.current_stock * product.cost_price),
        0
      ) || 0;

      setStats({
        totalProducts: totalProducts || 0,
        lowStock,
        nearExpiration: nearExpiration || 0,
        totalValue,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadCategoryData = async () => {
    try {
      const { data: products } = await supabase
        .from("products")
        .select(`
          current_stock,
          cost_price,
          categories (name)
        `)
        .eq("status", "ativo");

      if (!products) return;

      const categoryMap = new Map<string, { value: number; products: number }>();

      (products as CategoryProductRow[]).forEach((product) => {
        const categoryName = product.categories?.name || "Sem Categoria";
        const value = product.current_stock * product.cost_price;
        const existing = categoryMap.get(categoryName) || { value: 0, products: 0 };
        categoryMap.set(categoryName, {
          value: existing.value + value,
          products: existing.products + 1,
        });
      });

      const data = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        products: data.products,
      }));

      setCategoryData(data);
    } catch (error) {
      console.error("Erro ao carregar dados de categoria:", error);
    }
  };

  const loadMovementData = async () => {
    try {
      // Últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("type, quantity, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (!movements) return;

      // Agrupar por dia
      const dayMap = new Map<string, { entradas: number; saidas: number }>();

      (movements as MovementRow[]).forEach((mov) => {
        const date = new Date(mov.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        const existing = dayMap.get(date) || { entradas: 0, saidas: 0 };

        if (mov.type === "entrada") {
          existing.entradas += mov.quantity;
        } else if (mov.type === "saida") {
          existing.saidas += mov.quantity;
        }

        dayMap.set(date, existing);
      });

      const data = Array.from(dayMap.entries())
        .map(([date, values]) => ({
          date,
          ...values,
        }))
        .slice(-7);

      setMovementData(data);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("name, current_stock, minimum_stock")
        .eq("status", "ativo")
        .order("current_stock", { ascending: true })
        .limit(5);

      setLowStockProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos com estoque baixo:", error);
    }
  };

  interface StatCardProps {
    title: string;
    value: string | number;
    icon: ComponentType<{ className?: string }>;
    variant?: "default" | "success" | "warning" | "danger";
    helper?: string;
  }

  const StatCard = ({ title, value, icon: Icon, variant = "default", helper }: StatCardProps) => {
    const variants = {
      default: {
        bg: "bg-gradient-to-br from-white to-muted/60",
        icon: "bg-primary/15 text-primary",
      },
      success: {
        bg: "bg-gradient-to-br from-success/10 via-white to-muted/60",
        icon: "bg-success/20 text-success",
      },
      warning: {
        bg: "bg-gradient-to-br from-warning/15 via-white to-muted/60",
        icon: "bg-warning/20 text-warning-foreground",
      },
      danger: {
        bg: "bg-gradient-to-br from-destructive/10 via-white to-muted/60",
        icon: "bg-destructive/15 text-destructive",
      },
    };

    const tone = variants[variant as keyof typeof variants] || variants.default;

    return (
      <Card className={`overflow-hidden border-0 shadow-lg shadow-primary/5 ${tone.bg}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                {title}
              </p>
              <div className="text-3xl font-semibold">{value}</div>
              {helper && (
                <p className="text-xs text-muted-foreground">{helper}</p>
              )}
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tone.icon}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-primary/10 shadow-lg shadow-primary/10 bg-gradient-to-r from-primary/10 via-white to-accent/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Painel geral
                  </p>
                  <h1 className="text-3xl font-semibold">Dashboard</h1>
                  <p className="text-muted-foreground">
                    {isAdmin
                      ? "Visão financeira e operacional completa"
                      : "Visão geral do estoque e das movimentações"}
                  </p>
                </div>
                {profile && (
                  <Badge variant={isAdmin ? "destructive" : "secondary"} className="text-sm">
                    {isAdmin ? (
                      <>
                        <Shield className="h-3 w-3 mr-1" />
                        Admin • {profile.full_name}
                      </>
                    ) : (
                      `Gestor • ${profile.full_name}`
                    )}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => navigate("/products/new")}>
                  Novo produto
                </Button>
                <Button variant="outline" onClick={() => navigate("/movements")}>
                  Registrar movimentação
                </Button>
                <Button variant="ghost" onClick={() => navigate("/scanner")}>
                  Abrir scanner
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-lg shadow-primary/5">
            <CardContent className="p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                {todayLabel}
              </p>
              <p className="text-xl font-semibold">Radar de estoque</p>
              <p className="text-sm text-muted-foreground">
                Monitoramento de alertas críticos e produtos com atenção imediata.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="destructive">Baixos: {stats.lowStock}</Badge>
                <Badge variant="outline">Vencimento: {stats.nearExpiration}</Badge>
                {isAdmin && (
                  <Badge variant="secondary">
                    Valor total: R$ {stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Estatísticas */}
        <div className={`grid gap-4 ${isAdmin ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          <StatCard
            title="Total de Produtos"
            value={stats.totalProducts}
            icon={Package}
            helper="Itens ativos no catálogo"
            variant="default"
          />
          <StatCard
            title="Estoque Baixo"
            value={stats.lowStock}
            icon={TrendingDown}
            helper="Itens em alerta mínimo"
            variant="warning"
          />
          <StatCard
            title="Próximo ao Vencimento"
            value={stats.nearExpiration}
            icon={AlertTriangle}
            helper="Itens vencendo em 30 dias"
            variant="danger"
          />
          {/* Valor Total - Apenas Admin */}
          {isAdmin && (
            <StatCard
              title="Valor Total"
              value={`R$ ${stats.totalValue.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}`}
              icon={DollarSign}
              helper="Inventário valorizado"
              variant="success"
            />
          )}
        </div>

        {/* Gráficos */}
        <div className={`grid gap-4 ${isAdmin ? "md:grid-cols-2" : ""}`}>
          {/* Gráfico de Categorias - Apenas Admin */}
          {isAdmin && (
            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle>Valor por Categoria</CardTitle>
                <CardDescription>Distribuição do valor do estoque (Admin)</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          `R$ ${value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gráfico de Movimentações */}
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle>Movimentações (Últimos 7 dias)</CardTitle>
              <CardDescription>Entradas e saídas de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              {movementData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={movementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entradas" fill="#00C49F" name="Entradas" />
                    <Bar dataKey="saidas" fill="#FF8042" name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhuma movimentação nos últimos 7 dias
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Produtos com Estoque Baixo */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle>Top 5 - Produtos com Menor Estoque</CardTitle>
            <CardDescription>Produtos que precisam de atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Mínimo: {product.minimum_stock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          product.current_stock === 0
                            ? "text-destructive"
                            : product.current_stock <= product.minimum_stock
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {product.current_stock}
                      </p>
                      <p className="text-xs text-muted-foreground">em estoque</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum produto cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
