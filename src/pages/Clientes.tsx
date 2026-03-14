import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageCircle, Eye } from "lucide-react";
import { clients, stages, listas, responsaveis } from "@/data/mockData";
import { Client } from "@/data/types";
import { cn } from "@/lib/utils";
import ClientDetailDrawer from "@/components/ClientDetailDrawer";
import { buildWhatsAppUrl, formatDate, formatDateTime, getPrimaryClientMessage, getStageColor, getStageLabel } from "@/data/crm";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("");
  const [filterLista, setFilterLista] = useState("");
  const [filterResp, setFilterResp] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["crm-clientes-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceClients = remoteData?.clients?.length ? remoteData.clients : clients;
  const sourceStages = remoteData?.stages?.length ? remoteData.stages : stages;
  const sourceListas = remoteData?.listas?.length ? remoteData.listas : listas;
  const sourceResponsaveis =
    remoteData?.responsaveis?.length ? remoteData.responsaveis : responsaveis;
  const sourceTemplates = remoteData?.templates?.length ? remoteData.templates : undefined;

  const filtered = useMemo(() => {
    return sourceClients.filter((client) => {
      if (
        search &&
        !client.nome.toLowerCase().includes(search.toLowerCase()) &&
        !client.telefone.includes(search)
      ) {
        return false;
      }

      if (filterEtapa && client.etapa !== filterEtapa) return false;
      if (filterLista && client.lista !== filterLista) return false;
      if (filterResp && client.responsavel !== filterResp) return false;

      return true;
    });
  }, [filterEtapa, filterLista, filterResp, search, sourceClients]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Gerencie todos os seus contatos</p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "Carregando dados do Supabase..." : "Supabase conectado. Se nao houver registros, os mocks continuam como apoio."}
          </p>
        )}
      </div>

      <div className="glass-card flex flex-wrap items-center gap-3 rounded-xl p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={filterEtapa} onChange={(event) => setFilterEtapa(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Todas Etapas</option>
          {sourceStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
        <select value={filterLista} onChange={(event) => setFilterLista(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Todas Listas</option>
          {sourceListas.map((lista) => (
            <option key={lista} value={lista}>
              {lista}
            </option>
          ))}
        </select>
        <select value={filterResp} onChange={(event) => setFilterResp(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Todos Responsaveis</option>
          {sourceResponsaveis.map((responsavel) => (
            <option key={responsavel} value={responsavel}>
              {responsavel}
            </option>
          ))}
        </select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Lista</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Etapa</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Entrada</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Ultima Interacao</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Responsavel</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Acao</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const msg = getPrimaryClientMessage(client, sourceTemplates);
                const canOpenWhatsapp = Boolean(client.telefone && msg);

                return (
                  <tr key={client.id} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{client.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.telefone || "Sem telefone"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.lista}</td>
                    <td className="px-4 py-3">
                      <span className={cn("stage-badge text-accent-foreground", getStageColor(client.etapa))}>
                        {getStageLabel(client.etapa)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(client.dataEntrada)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(client.ultimaInteracao)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.responsavel}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedClient(client)} className="rounded-lg border border-border p-1.5 text-foreground transition-colors hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canOpenWhatsapp && (
                          <a href={buildWhatsAppUrl(client.telefone, msg)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-whatsapp p-1.5 text-whatsapp-foreground transition-opacity hover:opacity-90">
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
        {filtered.length === 0 && <p className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado</p>}
      </motion.div>

      <ClientDetailDrawer
        client={selectedClient}
        templates={sourceTemplates}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
