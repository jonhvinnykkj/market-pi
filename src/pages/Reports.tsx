import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";

export default function Reports() {
  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Card className="border-primary/10 shadow-lg shadow-primary/10 bg-gradient-to-r from-primary/10 via-white to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <CardDescription>
              Área reservada para relatórios. Em breve traremos exportações e dashboards adicionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Button variant="secondary" disabled>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV (em breve)
            </Button>
            <Button variant="outline" disabled>
              <BarChart3 className="h-4 w-4 mr-2" />
              Visualizar dashboard (em breve)
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
