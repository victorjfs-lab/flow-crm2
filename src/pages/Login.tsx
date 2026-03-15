import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && session) {
    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      toast({
        title: "Supabase não configurado",
        description: "Defina as variáveis do Supabase antes de usar o login.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Não foi possível entrar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Login realizado",
      description: "Seu CRM foi liberado com segurança.",
    });

    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";
    navigate(nextPath, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.3))] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden rounded-3xl border border-border/50 bg-card/70 p-10 shadow-sm backdrop-blur lg:block">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Área protegida do Flow CRM
            </div>
            <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-foreground">
              Seu funil visual agora com controle de acesso real.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Entre com seu usuário para acessar pipeline, clientes, renovações e a sincronização
              do HubSpot com mais segurança.
            </p>
            <div className="mt-10 grid gap-4">
              {[
                "Login com sessão persistente do Supabase",
                "Rotas internas protegidas",
                "Sincronização do HubSpot liberada apenas para usuário autenticado",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="border-border/60 shadow-lg shadow-primary/5">
            <CardHeader className="space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <LogIn className="h-5 w-5" />
              </div>
              <CardTitle className="text-3xl">Entrar no CRM</CardTitle>
              <CardDescription>
                Use seu email e senha para abrir o Flow CRM com segurança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
                      className="pl-9"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="pl-9"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
