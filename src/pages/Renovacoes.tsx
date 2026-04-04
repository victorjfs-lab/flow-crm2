import { useMemo, useState } from "react";
import { CalendarClock, Eye, MessageCircle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ClientDetailDrawer from "@/components/ClientDetailDrawer";
import { clients } from "@/data/mockData";
import { Client, MessageTemplate } from "@/data/types";
import {
  buildWhatsAppUrl,
  formatCurrency,
  formatDate,
  formatDateTime,
  getPrimaryClientMessage,
  getRenewalCandidates,
} from "@/data/crm";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";

export default function Renovacoes() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["crm-renovacoes-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceClients = isSupabaseConfigured ? (remoteData?.clients ?? []) : clients;
  const sourceTemplates = isSupabaseConfigured ? remoteData?.templates : undefined;
  const renewalEntries = useMemo(() => getRenewalCandidates(sourceClients), [sourceClients]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Renovações</h1>
        <p className="text-muted-foreground">
          Clientes Smart com renovação chegando 1 semana antes do fim do ciclo.
        </p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? "Carregando renovações do Supabase..."
              : "Renovações conectadas ao Supabase."}
          </p>
        )}
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          {renewalEntries.length} clientes prontos para contato de renovação
        </div>
      </div>

      {renewalEntries.length === 0 ? (
        <div className="glass-card overflow-hidden rounded-xl">
          <p className="py-16 text-center text-muted-foreground">
            Nenhuma renovação pendente por enquanto.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Produto</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Data da venda
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Fim do ciclo
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Lembrar em
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {renewalEntries.map(({ client, reminderDate, cycleEndDate }) => {
                  const msg = getPrimaryClientMessage(client, sourceTemplates);
                  const canOpenWhatsapp = Boolean(client.telefone && msg);
                  const isDueToday =
                    new Date(reminderDate).toDateString() === new Date().toDateString();

                  return (
                    <tr
                      key={client.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{client.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">Smart</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.dataVenda ? formatDate(client.dataVenda) : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(cycleEndDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{formatDateTime(reminderDate)}</span>
                          {isDueToday && (
                            <span className="inline-flex w-fit rounded-full bg-stage-espera/10 px-2 py-0.5 text-[11px] font-medium text-stage-espera">
                              Falar hoje
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.valorVenda != null ? formatCurrency(client.valorVenda) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedClient(client)}
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
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          Regra atual: clientes Smart entram aqui 7 dias antes do fim dos 5 meses de ciclo.
        </div>
      </div>

      <ClientDetailDrawer
        client={selectedClient}
        templates={sourceTemplates as MessageTemplate[] | undefined}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
