import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Clock,
  Send,
  Phone,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { clients, stages } from "@/data/mockData";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  formatDate,
  getClientCategorySummary,
  getClientMetrics,
  getFormConversionSummary,
  getNextActionLabel,
  getRecentActivities,
  getStageDistribution,
} from "@/data/crm";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  delay,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", color)}>
          <Icon className="h-5 w-5 text-accent-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function ActivityIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "whatsapp":
      return <MessageCircle className="h-4 w-4 text-whatsapp" />;
    case "ligacao":
      return <Phone className="h-4 w-4 text-stage-contato" />;
    case "novo":
      return <UserPlus className="h-4 w-4 text-stage-novo" />;
    default:
      return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function Dashboard() {
  const { data: remoteData, isLoading, isError } = useQuery({
    queryKey: ["crm-dashboard-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceClients = isSupabaseConfigured ? (remoteData?.clients ?? []) : clients;
  const sourceStages = isSupabaseConfigured ? (remoteData?.stages ?? stages) : stages;
  const metrics = getClientMetrics(sourceClients);
  const stageDistribution = getStageDistribution(sourceStages, sourceClients);
  const recentActivities = getRecentActivities(sourceClients);
  const formConversion = getFormConversionSummary(sourceClients);
  const categorySummary = getClientCategorySummary(sourceClients);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu funil comercial</p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? "Carregando dados do Supabase..."
              : isError
                ? "Erro ao carregar dados do Supabase."
                : "Dashboard conectado ao Supabase."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total de Clientes" value={metrics.total} icon={Users} color="bg-primary" delay={0} />
        <MetricCard title="Novos Hoje" value={metrics.novosHoje} icon={UserPlus} color="bg-stage-novo" delay={0.05} />
        <MetricCard title="Aguardando Contato" value={metrics.aguardandoContato} icon={Clock} color="bg-stage-espera" delay={0.1} />
        <MetricCard title="Propostas em Aberto" value={metrics.propostasAbertas} icon={Send} color="bg-accent" delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
        <MetricCard
          title="Indicador Free"
          value={categorySummary.indicadorFree}
          icon={Users}
          color="bg-stage-espera"
          delay={0.38}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-xl p-6 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Clientes por Etapa</h2>
            <Link to="/pipeline" className="text-sm font-medium text-primary hover:underline">
              Ver pipeline
            </Link>
          </div>
          <div className="space-y-3">
            {stageDistribution.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                <span className="min-w-[160px] text-sm font-medium text-foreground">{stage.label}</span>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full transition-all", stage.color)}
                      style={{ width: `${Math.max((stage.count / Math.max(sourceClients.length, 1)) * 100, 4)}%` }}
                    />
                  </div>
                </div>
                <span className="min-w-[28px] text-right text-sm font-semibold text-foreground">{stage.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">Atividades Recentes</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <ActivityIcon tipo={activity.tipo} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.clienteNome}</p>
                  <p className="truncate text-xs text-muted-foreground">{activity.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.responsavel} | {formatDate(activity.data)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-6"
        >
          <h2 className="mb-2 text-lg font-semibold text-foreground">Renovações Pendentes</h2>
          <p className="text-4xl font-bold text-foreground">{metrics.renovacoesPendentes}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Clientes Smart que já entraram na janela de renovação.
          </p>
          <Link to="/renovacoes" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Ver renovações
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-xl p-6 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Conversão por Formulário</h2>
            <span className="text-xs text-muted-foreground">Top 6 formulários</span>
          </div>
          <div className="space-y-3">
            {formConversion.map((item) => (
              <div
                key={item.formulario}
                className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <p className="truncate text-sm font-medium text-foreground">{item.formulario}</p>
                <p className="text-right text-xs text-muted-foreground">{item.leads} leads</p>
                <p className="text-right text-xs text-muted-foreground">{item.vendas} vendas</p>
                <p className="text-right text-sm font-semibold text-foreground">{item.conversao}%</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Próximas Ações</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sourceClients
            .filter((client) => client.etapa === "novo" || client.etapa === "contato")
            .slice(0, 6)
            .map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{client.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {getNextActionLabel(client)} | {client.responsavel}
                  </p>
                </div>
                <Link
                  to={`/clientes/${client.id}`}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Abrir
                </Link>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
