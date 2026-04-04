import { useMemo, useState } from "react";
import { Calendar, Eye, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ClientDetailDrawer from "@/components/ClientDetailDrawer";
import { clients } from "@/data/mockData";
import { Client, MessageTemplate } from "@/data/types";
import {
  buildWhatsAppUrl,
  formatDateTime,
  getPrimaryClientMessage,
  getStageLabel,
} from "@/data/crm";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";

export default function CalendarioClientes() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["crm-calendario-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceClients = isSupabaseConfigured ? (remoteData?.clients ?? []) : clients;
  const sourceTemplates = isSupabaseConfigured ? remoteData?.templates : undefined;

  const scheduledClients = useMemo(
    () =>
      sourceClients
        .filter((client) => client.lembreteContato)
        .sort(
          (firstClient, secondClient) =>
            new Date(firstClient.lembreteContato ?? "").getTime() -
            new Date(secondClient.lembreteContato ?? "").getTime(),
        ),
    [sourceClients],
  );

  const groupedClients = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    return {
      atrasados: scheduledClients.filter((client) => {
        const reminderDate = client.lembreteContato ? new Date(client.lembreteContato) : null;
        return reminderDate ? reminderDate < today : false;
      }),
      hoje: scheduledClients.filter((client) =>
        isDateBetween(client.lembreteContato, today, tomorrow),
      ),
      amanha: scheduledClients.filter((client) =>
        isDateBetween(client.lembreteContato, tomorrow, dayAfterTomorrow),
      ),
      proximosDias: scheduledClients.filter((client) => {
        const reminderDate = client.lembreteContato ? new Date(client.lembreteContato) : null;
        return reminderDate ? reminderDate >= dayAfterTomorrow : false;
      }),
    };
  }, [scheduledClients]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendário Clientes</h1>
        <p className="text-muted-foreground">
          Veja quais clientes precisam ser chamados em cada data.
        </p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "Carregando agenda do Supabase..." : "Agenda conectada ao Supabase."}
          </p>
        )}
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {scheduledClients.length} lembretes programados
        </div>
      </div>

      {scheduledClients.length === 0 ? (
        <div className="glass-card overflow-hidden rounded-xl">
          <p className="py-16 text-center text-muted-foreground">
            Nenhum lembrete cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ReminderSection
            title="Atrasados"
            description="Clientes cujo lembrete já venceu e precisam de atenção imediata."
            clients={groupedClients.atrasados}
            templates={sourceTemplates}
            onOpenClient={setSelectedClient}
            highlightTone="danger"
          />
          <ReminderSection
            title="Hoje"
            description="Clientes que precisam de contato ainda hoje."
            clients={groupedClients.hoje}
            templates={sourceTemplates}
            onOpenClient={setSelectedClient}
            highlightTone="warning"
          />
          <ReminderSection
            title="Amanhã"
            description="Clientes programados para o próximo dia."
            clients={groupedClients.amanha}
            templates={sourceTemplates}
            onOpenClient={setSelectedClient}
          />
          <ReminderSection
            title="Próximos dias"
            description="Agenda futura para organizar seus retornos."
            clients={groupedClients.proximosDias}
            templates={sourceTemplates}
            onOpenClient={setSelectedClient}
          />
        </div>
      )}

      <ClientDetailDrawer
        client={selectedClient}
        templates={sourceTemplates}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}

function ReminderSection({
  title,
  description,
  clients,
  templates,
  onOpenClient,
  highlightTone = "default",
}: {
  title: string;
  description: string;
  clients: Client[];
  templates?: MessageTemplate[];
  onOpenClient: (client: Client) => void;
  highlightTone?: "default" | "warning" | "danger";
}) {
  const sectionTone =
    highlightTone === "danger"
      ? "bg-destructive/5"
      : highlightTone === "warning"
        ? "bg-stage-espera/5"
        : "bg-muted/30";

  const badgeTone =
    highlightTone === "danger"
      ? "bg-destructive/10 text-destructive"
      : highlightTone === "warning"
        ? "bg-stage-espera/10 text-stage-espera"
        : "bg-background text-muted-foreground";

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className={`border-b border-border px-4 py-4 ${sectionTone}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeTone}`}>
            {clients.length} clientes
          </span>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum cliente nessa faixa.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Lembrete</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Formulário</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Etapa</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const msg = getPrimaryClientMessage(client, templates);
                const canOpenWhatsapp = Boolean(client.telefone && msg);

                return (
                  <tr
                    key={client.id}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{client.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(client.lembreteContato ?? "")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.formulario}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getStageLabel(client.etapa)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onOpenClient(client)}
                          className="rounded-lg border border-border p-1.5 text-foreground transition-colors hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canOpenWhatsapp && (
                          <a
                            href={buildWhatsAppUrl(client.telefone, msg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-whatsapp p-1.5 text-whatsapp-foreground transition-opacity hover:opacity-90"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function isDateBetween(dateValue: string | null | undefined, start: Date, end: Date) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  return date >= start && date < end;
}
