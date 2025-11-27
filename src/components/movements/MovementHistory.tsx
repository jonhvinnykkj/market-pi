import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp, ArrowDown, RefreshCw, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Movement {
  id: string;
  type: "entrada" | "saida" | "ajuste" | "inventario";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

interface MovementHistoryProps {
  productId?: string;
  limit?: number;
}

export function MovementHistory({ productId, limit }: MovementHistoryProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadMovements();
  }, [productId]);

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("stock_movements")
        .select(`
          *,
          products (id, name),
          profiles (full_name)
        `)
        .order("created_at", { ascending: false });

      // Filtrar por produto se fornecido
      if (productId) {
        query = query.eq("product_id", productId);
      }

      // Limitar quantidade se fornecido
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = movements.filter((movement) => {
    const matchesType = filterType === "all" || movement.type === filterType;
    const matchesSearch =
      !searchTerm ||
      movement.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.profiles?.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  const clearFilters = () => {
    setFilterType("all");
    setSearchTerm("");
  };

  const hasFilters = filterType !== "all" || searchTerm !== "";

  const getTypeConfig = (type: Movement["type"]) => {
    const configs = {
      entrada: {
        label: "Entrada",
        icon: ArrowDown,
        variant: "default" as const,
        color: "text-green-600",
      },
      saida: {
        label: "Saída",
        icon: ArrowUp,
        variant: "destructive" as const,
        color: "text-red-600",
      },
      ajuste: {
        label: "Ajuste",
        icon: RefreshCw,
        variant: "warning" as const,
        color: "text-yellow-600",
      },
      inventario: {
        label: "Inventário",
        icon: FileText,
        variant: "secondary" as const,
        color: "text-blue-600",
      },
    };
    return configs[type];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros - apenas mostrar se não tiver productId */}
      {!productId && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por produto ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
                <SelectItem value="ajuste">Ajustes</SelectItem>
                <SelectItem value="inventario">Inventários</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Lista em cards para mobile */}
      <div className="space-y-3 md:hidden">
        {filteredMovements.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhuma movimentação encontrada
          </Card>
        ) : (
          filteredMovements.map((movement) => {
            const config = getTypeConfig(movement.type);
            const Icon = config.icon;

            return (
              <Card key={movement.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    {!productId && (
                      <p className="font-semibold">
                        {movement.products?.name || "N/A"}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                  <Badge variant={config.variant} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade</span>
                  <span className={`text-lg font-semibold ${config.color}`}>
                    {movement.type === "entrada" && "+"}
                    {movement.type === "saida" && "-"}
                    {movement.quantity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque anterior</p>
                    <p className="font-medium">{movement.previous_stock}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque novo</p>
                    <p className="font-medium">{movement.new_stock}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Usuário:</span>{" "}
                    {movement.profiles?.full_name || "Sistema"}
                  </p>
                  <p className="text-foreground text-sm">
                    {movement.reason || <span className="italic text-muted-foreground">Sem justificativa</span>}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Tabela desktop */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                {!productId && <TableHead>Produto</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Estoque Ant.</TableHead>
                <TableHead className="text-right">Estoque Novo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={productId ? 7 : 8}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => {
                  const config = getTypeConfig(movement.type);
                  const Icon = config.icon;

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(movement.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(movement.created_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>

                      {!productId && (
                        <TableCell className="font-medium">
                          {movement.products?.name || "N/A"}
                        </TableCell>
                      )}

                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>

                      <TableCell className={`text-right font-semibold ${config.color}`}>
                        {movement.type === "entrada" && "+"}
                        {movement.type === "saida" && "-"}
                        {movement.quantity}
                      </TableCell>

                      <TableCell className="text-right text-muted-foreground">
                        {movement.previous_stock}
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {movement.new_stock}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {movement.profiles?.full_name || "Sistema"}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        {movement.reason ? (
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {movement.reason}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Sem justificativa
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Informações */}
      <div className="text-sm text-muted-foreground text-center">
        {filteredMovements.length} movimentação(ões)
        {limit && movements.length >= limit && " (limitado)"}
      </div>
    </div>
  );
}
