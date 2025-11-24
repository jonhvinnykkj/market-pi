import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Info, ShieldCheck, Activity, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Verificar se já está logado
    const session = localStorage.getItem("session");
    if (session) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simular delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar credenciais (usuários pré-definidos)
      const users = [
        { id: "1", username: "admin", password: "teste123", full_name: "Administrador do Sistema", role: "admin" },
        { id: "2", username: "gestor", password: "teste123", full_name: "Gestor de Estoque", role: "gestor" }
      ];

      const user = users.find(u => u.username === username && u.password === password);

      if (!user) {
        throw new Error("Usuário ou senha inválidos");
      }

      // Criar sessão
      const session = {
        access_token: `mock-token-${user.id}`,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        }
      };

      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("user", JSON.stringify(session.user));

      toast({
        title: "Login realizado!",
        description: `Bem-vindo, ${user.full_name}`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-accent/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsla(var(--primary),0.12),transparent_25%),radial-gradient(circle_at_80%_10%,hsla(var(--accent),0.12),transparent_28%)]" />
      <div className="relative max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-4 w-4" />
              Nova experiência
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
              Estoque com visual renovado e operações mais claras.
            </h1>
            <p className="text-muted-foreground text-lg">
              Controle entradas, saídas e catálogo de produtos em um painel rápido e consistente.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-white/70 backdrop-blur-md p-4 shadow-lg shadow-primary/10">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Acesso seguro</p>
                    <p className="text-sm text-muted-foreground">Sessões persistentes</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border bg-white/70 backdrop-blur-md p-4 shadow-lg shadow-accent/10">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="font-semibold">Operação ágil</p>
                    <p className="text-sm text-muted-foreground">Fluxos de estoque simplificados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg ml-auto space-y-4">
            <Card className="shadow-2xl shadow-primary/10 border-primary/10">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Entrar</CardTitle>
                    <CardDescription>Acesse o Market Manager</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="admin ou gestor"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Acessar painel"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Credenciais de teste */}
            <Alert className="bg-white/70 backdrop-blur-md border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Usuários de Teste:</strong>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <div>👤 admin / teste123 (Administrador)</div>
                  <div>👤 gestor / teste123 (Gestor)</div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
