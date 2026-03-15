import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SyncContactsButton from "@/components/SyncContactsButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/calendario-clientes", label: "Calendário Clientes", icon: CalendarDays },
  { to: "/renovacoes", label: "Renovações", icon: RefreshCw },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const userEmail = session?.user.email || "usuario@crm.local";
  const userName = useMemo(() => {
    const metadataName = session?.user.user_metadata?.full_name;

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }

    return userEmail.split("@")[0] || "Usuário";
  }, [session, userEmail]);

  const userInitials = useMemo(() => {
    return (
      userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "FC"
    );
  }, [userName]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);

    if (error) {
      toast({
        title: "Não foi possível sair",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sessão encerrada",
      description: "O CRM foi bloqueado com segurança.",
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
            <Zap className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-primary">Flow CRM</span>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-primary">{userName}</p>
              <p className="truncate text-xs text-sidebar-muted">{userEmail}</p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex-1" />
          <SyncContactsButton />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
