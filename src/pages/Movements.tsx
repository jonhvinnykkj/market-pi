import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovementForm } from "@/components/movements/MovementForm";
import { MovementHistory } from "@/components/movements/MovementHistory";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

export default function Movements() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  const [prefilledData, setPrefilledData] = useState<{
    productId?: string;
    type?: "entrada" | "saida" | "ajuste" | "inventario";
  }>({});

  useEffect(() => {
    checkAuth();

    // Verificar se há dados pré-preenchidos do state da navegação
    if (location.state) {
      const { productId, type } = location.state as any;
      if (productId || type) {
        setPrefilledData({ productId, type });
        setShowDialog(true);
      }
    }
  }, [location.state]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleNewMovement = (type?: "entrada" | "saida" | "ajuste") => {
    setPrefilledData({ type });
    setShowDialog(true);
  };

  const handleSuccess = () => {
    setShowDialog(false);
    setPrefilledData({});
    // Recarregar histórico (MovementHistory tem seu próprio useEffect)
    window.location.reload();
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPrefilledData({});
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Movimentações de Estoque</h1>
            <p className="text-muted-foreground">
              Registre e acompanhe todas as movimentações
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleNewMovement("entrada")}
              variant="outline"
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Entrada
            </Button>
            <Button onClick={() => handleNewMovement("saida")} variant="outline">
              <ArrowUp className="mr-2 h-4 w-4" />
              Saída
            </Button>
            <Button onClick={() => handleNewMovement()} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Nova Movimentação
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entradas do Mês
              </CardTitle>
              <ArrowDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Total de entradas este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
              <ArrowUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Total de saídas este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Ajustes realizados este mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Histórico */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Histórico de Movimentações</h2>
          <MovementHistory />
        </div>

        {/* Dialog de Nova Movimentação */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
              <DialogDescription>
                Registre uma nova movimentação de estoque
              </DialogDescription>
            </DialogHeader>
            <MovementForm
              productId={prefilledData.productId}
              movementType={prefilledData.type}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
