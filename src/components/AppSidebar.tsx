import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  QrCode,
  LogOut,
  Shield,
  UserCog,
  FolderTree,
  Wand2,
  PlusCircle,
  ScanLine,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home, roles: ["admin", "gestor"] },
  { title: "Produtos", url: "/products", icon: Package, roles: ["admin", "gestor"] },
  { title: "Categorias", url: "/categories", icon: FolderTree, roles: ["admin", "gestor"] },
  { title: "Movimentações", url: "/movements", icon: ShoppingCart, roles: ["admin", "gestor"] },
  { title: "Scanner QR", url: "/scanner", icon: QrCode, roles: ["admin", "gestor"] },
  { title: "Fornecedores", url: "/suppliers", icon: Users, roles: ["admin", "gestor"] },
  { title: "Relatórios", url: "/reports", icon: BarChart3, roles: ["admin"] },
];

export const adminItems = [
  { title: "Gerenciar Usuários", url: "/users", icon: UserCog },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, profile, isLoading } = useUserRole();
  const currentPath = location.pathname;
  const role = profile?.role || "gestor";
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "MM";

  const isActive = (path: string) => currentPath === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  // Filtrar itens do menu baseado no role
  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(role as string)
  );

  return (
    <Sidebar
      className={`${
        !open ? "w-14" : "w-64"
      } bg-sidebar text-sidebar-foreground border-r border-sidebar-border/70 hidden lg:flex`}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          {open && (
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.28em] text-sidebar-foreground/70">
                Estoque
              </p>
              <p className="text-lg font-semibold">Market Manager</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Informações do Usuário */}
        {open && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/60 p-3 shadow-inner">
              <Avatar className="h-10 w-10 border border-sidebar-border/70">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {profile?.full_name || "Operador"}
                </p>
                <p className="text-xs text-sidebar-foreground/70">
                  {isLoading ? "Carregando..." : isAdmin ? "Administrador" : "Gestor"}
                </p>
              </div>
              <Badge
                variant={isAdmin ? "destructive" : "outline"}
                className="text-[10px] uppercase"
              >
                {isAdmin ? (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                ) : (
                  "Gestor"
                )}
              </Badge>
            </div>
          </div>
        )}

        {open && <Separator className="opacity-60" />}

        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-[0.24em] text-sidebar-foreground/60">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-xl hover:bg-sidebar-accent/80 data-[active=true]:bg-sidebar-accent">
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-semibold shadow-inner shadow-primary/10"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Atalhos */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-[0.24em] text-sidebar-foreground/60">
            Atalhos
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3 space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start rounded-xl"
              onClick={() => navigate("/products/new")}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo produto
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl border border-sidebar-border/60 hover:border-primary/60"
              onClick={() => navigate("/scanner")}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner QR
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Admin (apenas para administradores) */}
        {isAdmin && (
          <>
            {open && <Separator className="my-2" />}
            <SidebarGroup>
              <SidebarGroupLabel>
                {open ? (
                  <span className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Administração
                  </span>
                ) : (
                  <Shield className="h-3 w-3" />
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {open && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <div className="p-4 space-y-2">
          {open && (
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
              <Wand2 className="h-4 w-4 text-primary" />
              <span>Interface renovada • v2</span>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start rounded-xl hover:bg-sidebar-accent"
            size={!open ? "icon" : "default"}
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
