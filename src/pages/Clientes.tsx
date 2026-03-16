import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, MessageCircle, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ClientDetailDrawer from "@/components/ClientDetailDrawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clients, listas, responsaveis, stages } from "@/data/mockData";
import { Client } from "@/data/types";
import {
  buildWhatsAppUrl,
  formatDate,
  formatDateTime,
  getPrimaryClientMessage,
  getStageColor,
  getStageLabel,
} from "@/data/crm";
import { useToast } from "@/hooks/use-toast";
import { loadCrmSnapshot } from "@/lib/crm-loader";
import { createManualContact } from "@/lib/crm-repository";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const EMPTY_MANUAL_CONTACT_FORM = {
  nome: "",
  telefone: "",
  email: "",
  formulario: "",
  origem: "Manual",
  observacoes: "",
  etapa: "espera",
  lista: "",
  responsavel: "",
};

export default function Clientes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("");
  const [filterLista, setFilterLista] = useState("");
  const [filterResp, setFilterResp] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [manualContactForm, setManualContactForm] = useState(EMPTY_MANUAL_CONTACT_FORM);

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

  const createContactMutation = useMutation({
    mutationFn: createManualContact,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-calendario-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
      ]);

      setManualContactForm(EMPTY_MANUAL_CONTACT_FORM);
      setIsCreateOpen(false);
      toast({
        title: "Contato cadastrado",
        description: "O contato foi criado manualmente no CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar contato",
        description:
          error instanceof Error ? error.message : "Não foi possível criar o contato.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    return sourceClients.filter((client) => {
      const normalizedSearch = search.trim().toLowerCase();

      if (
        normalizedSearch &&
        !client.nome.toLowerCase().includes(normalizedSearch) &&
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

  const handleCreateManualContact = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Cadastro indisponível",
        description: "Conecte o Supabase para criar contatos manuais.",
        variant: "destructive",
      });
      return;
    }

    await createContactMutation.mutateAsync({
      fullName: manualContactForm.nome,
      whatsappPhone: manualContactForm.telefone,
      email: manualContactForm.email,
      formName: manualContactForm.formulario,
      source: manualContactForm.origem,
      notes: manualContactForm.observacoes,
      stageCode: manualContactForm.etapa,
      listName: manualContactForm.lista,
      ownerName: manualContactForm.responsavel,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie todos os seus contatos</p>
          {isSupabaseConfigured && (
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading
                ? "Carregando dados do Supabase..."
                : "Supabase conectado. Se não houver registros, os mocks continuam como apoio."}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo contato
        </button>
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
        <select
          value={filterEtapa}
          onChange={(event) => setFilterEtapa(event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todas as etapas</option>
          {sourceStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
        <select
          value={filterLista}
          onChange={(event) => setFilterLista(event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todas as listas</option>
          {sourceListas.map((lista) => (
            <option key={lista} value={lista}>
              {lista}
            </option>
          ))}
        </select>
        <select
          value={filterResp}
          onChange={(event) => setFilterResp(event.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todos os responsáveis</option>
          {sourceResponsaveis.map((responsavel) => (
            <option key={responsavel} value={responsavel}>
              {responsavel}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card overflow-hidden rounded-xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Lista</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Etapa</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Entrada</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Última interação
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Responsável
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const message = getPrimaryClientMessage(client, sourceTemplates);
                const canOpenWhatsapp = Boolean(client.telefone && message);

                return (
                  <tr
                    key={client.id}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{client.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {client.telefone || "Sem telefone"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.lista}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "stage-badge text-accent-foreground",
                          getStageColor(client.etapa),
                        )}
                      >
                        {getStageLabel(client.etapa)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(client.dataEntrada)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(client.ultimaInteracao)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.responsavel}</td>
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
                            href={buildWhatsAppUrl(client.telefone, message)}
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

        {filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">Nenhum cliente encontrado</p>
        )}
      </motion.div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>
              Cadastre manualmente um contato para ele entrar direto no CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Nome</span>
              <input
                value={manualContactForm.nome}
                onChange={(event) =>
                  setManualContactForm((current) => ({ ...current, nome: event.target.value }))
                }
                placeholder="Nome completo"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Telefone</span>
              <input
                value={manualContactForm.telefone}
                onChange={(event) =>
                  setManualContactForm((current) => ({
                    ...current,
                    telefone: event.target.value,
                  }))
                }
                placeholder="WhatsApp do cliente"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">E-mail</span>
              <input
                value={manualContactForm.email}
                onChange={(event) =>
                  setManualContactForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="E-mail do cliente"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Formulário</span>
              <input
                value={manualContactForm.formulario}
                onChange={(event) =>
                  setManualContactForm((current) => ({
                    ...current,
                    formulario: event.target.value,
                  }))
                }
                placeholder="Nome do formulário ou canal"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Origem</span>
              <input
                value={manualContactForm.origem}
                onChange={(event) =>
                  setManualContactForm((current) => ({ ...current, origem: event.target.value }))
                }
                placeholder="Origem do lead"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Etapa</span>
              <select
                value={manualContactForm.etapa}
                onChange={(event) =>
                  setManualContactForm((current) => ({ ...current, etapa: event.target.value }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {sourceStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Lista</span>
              <select
                value={manualContactForm.lista}
                onChange={(event) =>
                  setManualContactForm((current) => ({ ...current, lista: event.target.value }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Sem lista</option>
                {sourceListas.map((lista) => (
                  <option key={lista} value={lista}>
                    {lista}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Responsável</span>
              <select
                value={manualContactForm.responsavel}
                onChange={(event) =>
                  setManualContactForm((current) => ({
                    ...current,
                    responsavel: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Sem responsável</option>
                {sourceResponsaveis.map((responsavel) => (
                  <option key={responsavel} value={responsavel}>
                    {responsavel}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Observações</span>
              <textarea
                value={manualContactForm.observacoes}
                onChange={(event) =>
                  setManualContactForm((current) => ({
                    ...current,
                    observacoes: event.target.value,
                  }))
                }
                placeholder="Detalhes importantes sobre esse contato"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleCreateManualContact()}
              disabled={createContactMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createContactMutation.isPending ? "Salvando..." : "Salvar contato"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientDetailDrawer
        client={selectedClient}
        templates={sourceTemplates}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
