import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  changes: any;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

interface AuditLogsProps {
  limit?: number;
  userId?: string;  // Para filtrar logs de um usuário específico
}

export function AuditLogs({ limit, userId }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select(`
          *,
          profiles (full_name, role)
        `)
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    const matchesSearch =
      !searchTerm ||
      log.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAction && matchesTable && matchesSearch;
  });

  const clearFilters = () => {
    setFilterAction("all");
    setFilterTable("all");
    setSearchTerm("");
  };

  const hasFilters = filterAction !== "all" || filterTable !== "all" || searchTerm !== "";

  const getActionBadge = (action: string) => {
    const badges = {
      create: { variant: "default" as const, label: "Criar" },
      update: { variant: "secondary" as const, label: "Atualizar" },
      delete: { variant: "destructive" as const, label: "Excluir" },
      login: { variant: "outline" as const, label: "Login" },
      logout: { variant: "outline" as const, label: "Logout" },
    };

    const config = badges[action as keyof typeof badges] || {
      variant: "outline" as const,
      label: action,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      products: "Produtos",
      stock_movements: "Movimentações",
      suppliers: "Fornecedores",
      categories: "Categorias",
      profiles: "Usuários",
    };

    return labels[tableName] || tableName;
  };

  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Logs de Auditoria
            </CardTitle>
            <CardDescription>
              Registro de todas as ações realizadas no sistema
            </CardDescription>
          </div>
          <Button onClick={loadLogs} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        {!userId && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Buscar por usuário ou tabela..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="create">Criar</SelectItem>
                <SelectItem value="update">Atualizar</SelectItem>
                <SelectItem value="delete">Excluir</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {getTableLabel(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="outline" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.profiles?.full_name || "N/A"}
                        </span>
                        {log.profiles?.role && (
                          <Badge variant="outline" className="w-fit text-xs mt-1">
                            {log.profiles.role === "admin" ? "Admin" : "Gestor"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{getActionBadge(log.action)}</TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {getTableLabel(log.table_name)}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-xs">
                      {log.changes && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground hover:text-foreground">
                            Ver mudanças
                          </summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.record_id && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          ID: {log.record_id.substring(0, 8)}...
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground text-center">
          {filteredLogs.length} registro(s)
          {limit && logs.length >= limit && " (limitado)"}
        </div>
      </CardContent>
    </Card>
  );
}
