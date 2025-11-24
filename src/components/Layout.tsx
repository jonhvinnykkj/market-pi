import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useUserRole } from "@/hooks/use-user-role";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "./MobileNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, isAdmin } = useUserRole();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-white to-muted/60">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsla(var(--primary),0.08),transparent_25%),radial-gradient(circle_at_90%_10%,hsla(var(--accent),0.10),transparent_25%)] pointer-events-none" />

          <header className="sticky top-0 z-20 border-b border-border/60 bg-white/80 backdrop-blur-xl">
            <div className="h-16 flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <MobileNav />
                <SidebarTrigger className="hidden lg:inline-flex h-9 w-9 rounded-full border border-border/60 hover:border-primary/60 transition-colors" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Estoque inteligente
                  </p>
                  <p className="text-lg font-semibold">Market Manager</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {profile && (
                  <Badge
                    variant={isAdmin ? "destructive" : "secondary"}
                    className="rounded-full"
                  >
                    {isAdmin ? "Admin" : "Gestor"}
                  </Badge>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {profile?.full_name || "Operador"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sessão ativa e segura
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
            <div className="relative max-w-7xl mx-auto w-full space-y-6">
              <div className="absolute inset-x-0 -top-8 h-24 bg-gradient-to-r from-primary/10 via-accent/15 to-primary/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
