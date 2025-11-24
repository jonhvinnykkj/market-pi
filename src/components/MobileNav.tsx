import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, Shield, Package, ScanLine, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { adminItems, menuItems } from "./AppSidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { profile, isAdmin, role } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "MM";

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(role || ""));

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    navigate("/auth");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden rounded-full border-border/70">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] bg-sidebar text-sidebar-foreground border-sidebar-border">
        <SheetHeader className="space-y-2">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-sidebar-border/70">
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold">{profile?.full_name || "Operador"}</p>
              <p className="text-xs text-sidebar-foreground/70">{isAdmin ? "Administrador" : "Gestor"}</p>
            </div>
          </SheetTitle>
          <div className="flex gap-2">
            <Badge variant={isAdmin ? "destructive" : "secondary"} className="rounded-full text-xs">
              {isAdmin ? "Admin" : "Gestor"}
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs">
              Sessão ativa
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-sidebar-foreground/60">Navegação</p>
            <nav className="flex flex-col gap-1">
              {visibleMenuItems.map((item) => (
                <SheetClose asChild key={item.title}>
                  <NavLink
                    to={item.url}
                    onClick={() => handleNavigate(item.url)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-primary font-semibold"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-sidebar-foreground/60">Administração</p>
              <nav className="flex flex-col gap-1">
                {adminItems.map((item) => (
                  <SheetClose asChild key={item.title}>
                    <NavLink
                      to={item.url}
                      onClick={() => handleNavigate(item.url)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SheetClose>
                ))}
              </nav>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start rounded-lg"
              onClick={() => handleNavigate("/products/new")}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo produto
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-lg border border-sidebar-border/60 hover:border-primary/60"
              onClick={() => handleNavigate("/scanner")}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner QR
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start rounded-lg hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
