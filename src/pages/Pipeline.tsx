import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus2, GripVertical, MessageCircle, Wallet } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ClientDetailDrawer from "@/components/ClientDetailDrawer";
import { buildWhatsAppUrl, formatDateTime, getPrimaryClientMessage, getPriorityMeta } from "@/data/crm";
import { clients, messageTemplates, stages } from "@/data/mockData";
import { Client, MessageTemplate } from "@/data/types";
import { useToast } from "@/hooks/use-toast";
import { loadCrmSnapshot } from "@/lib/crm-loader";
import { moveContactToStage } from "@/lib/crm-repository";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const DEFAULT_LIST_FILTER = "todas";

function PipelineCard({
  client,
  templates,
  onOpen,
  onDragStart,
  onSchedule,
  onMarkSale,
}: {
  client: Client;
  templates: MessageTemplate[];
  onOpen: (client: Client) => void;
  onDragStart: (client: Client) => void;
  onSchedule: (client: Client) => void;
  onMarkSale: (client: Client) => void;
}) {
  const message = getPrimaryClientMessage(client, templates);
  const canOpenWhatsapp = Boolean(client.telefone && message);
  const priority = getPriorityMeta(client);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      draggable
      onDragStart={() => onDragStart(client)}
      className="cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {client.nome
              .split(" ")
              .map((name) => name[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{client.nome}</p>
            <p className="text-xs text-muted-foreground">{client.lista}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          <GripVertical className="h-3 w-3" />
          Arraste
        </div>
      </div>

      <div className="mb-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {client.formulario}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-1 text-[11px] font-medium",
              priority.tone,
            )}
          >
            {priority.label}
          </span>
        </div>
      </div>

      <div className="mb-3 space-y-2 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="line-clamp-3 text-xs leading-relaxed text-foreground/85">
            {client.observacoes?.trim() || "Sem observações"}
          </p>
        </div>
        <div>Última interação: {formatDateTime(client.ultimaInteracao)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpen(client)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Detalhes
        </button>
        <button
          onClick={() => onSchedule(client)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <CalendarPlus2 className="h-3.5 w-3.5" />
          Agendar
        </button>
        <button
          onClick={() => onMarkSale(client)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Wallet className="h-3.5 w-3.5" />
          Venda
        </button>
        {canOpenWhatsapp && (
          <a
            href={buildWhatsAppUrl(client.telefone, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-whatsapp px-3 py-1.5 text-xs font-medium text-whatsapp-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function Pipeline() {
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerStartsInEditMode, setDrawerStartsInEditMode] = useState(false);
  const [drawerInitialSection, setDrawerInitialSection] = useState<
    "schedule" | "sale" | null
  >(null);
  const [selectedForm, setSelectedForm] = useState("todos");
  const [selectedList, setSelectedList] = useState(DEFAULT_LIST_FILTER);
  const [draggedClient, setDraggedClient] = useState<Client | null>(null);
  const [localClients, setLocalClients] = useState<Client[]>([]);

  const { data: remoteData, isLoading, isError } = useQuery({
    queryKey: ["crm-pipeline-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceClients = isSupabaseConfigured ? (remoteData?.clients ?? []) : clients;
  const sourceStages = isSupabaseConfigured ? (remoteData?.stages ?? stages) : stages;
  const sourceTemplates = isSupabaseConfigured
    ? (remoteData?.templates ?? [])
    : messageTemplates;

  const listOptions = useMemo(
    () =>
      Array.from(new Set(sourceClients.map((client) => client.lista || "Sem lista"))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [sourceClients],
  );

  const formOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sourceClients
            .map((client) => client.formulario?.trim())
            .filter((formulario) => formulario && formulario !== "Sem formulário"),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [sourceClients],
  );

  const displayedClients = localClients.length > 0 ? localClients : sourceClients;

  useEffect(() => {
    setLocalClients(sourceClients);
  }, [sourceClients]);

  useEffect(() => {
    setSelectedList("todas");
  }, []);

  useEffect(() => {
    if (selectedForm === "todos") {
      return;
    }

    if (!formOptions.includes(selectedForm)) {
      setSelectedForm("todos");
    }
  }, [formOptions, selectedForm]);

  useEffect(() => {
    if (selectedList === "todas") {
      return;
    }

    if (!listOptions.includes(selectedList)) {
      setSelectedList("todas");
    }
  }, [listOptions, selectedList]);

  const moveStageMutation = useMutation({
    mutationFn: moveContactToStage,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
      ]);
    },
    onError: (error) => {
      setLocalClients(sourceClients);
      toast({
        title: "Erro ao mover card",
        description:
          error instanceof Error ? error.message : "Não foi possível mover o contato.",
        variant: "destructive",
      });
    },
  });

  const handleDropOnStage = async (targetStageId: Client["etapa"]) => {
    if (!draggedClient || draggedClient.etapa === targetStageId) {
      return;
    }

    const previousClients = displayedClients;
    const updatedClients = displayedClients.map((client) =>
      client.id === draggedClient.id ? { ...client, etapa: targetStageId } : client,
    );

    setLocalClients(updatedClients);
    setDraggedClient(null);

    if (!isSupabaseConfigured) {
      toast({
        title: "Movido localmente",
        description:
          "O card foi movido apenas na tela porque o Supabase não está configurado.",
      });
      return;
    }

    try {
      await moveStageMutation.mutateAsync({
        contactId: draggedClient.id,
        fromStageCode: draggedClient.etapa,
        toStageCode: targetStageId,
      });
    } catch {
      setLocalClients(previousClients);
    }
  };

  const scrollToStage = (stageId: string) => {
    const container = kanbanScrollRef.current;
    const stageElement = stageRefs.current[stageId];

    if (!container || !stageElement) {
      return;
    }

    const left = stageElement.offsetLeft - 16;
    container.scrollTo({
      left,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground">Visualize seus clientes em cada etapa do funil</p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "Carregando dados do Supabase..." : "Pipeline conectado ao Supabase."}
          </p>
        )}
      </div>

      <div className="glass-card flex flex-wrap items-center gap-3 rounded-xl p-4">
        <div className="min-w-[220px]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lista
          </p>
          <select
            value={selectedList}
            onChange={(event) => setSelectedList(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="todas">Todas as listas</option>
            {listOptions.map((listOption) => (
              <option key={listOption} value={listOption}>
                {listOption}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px]">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Formulário
          </p>
          <select
            value={selectedForm}
            onChange={(event) => setSelectedForm(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="todos">Todos os formulários</option>
            {formOptions.map((formOption) => (
              <option key={formOption} value={formOption}>
                {formOption}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          {selectedList === "todas"
            ? selectedForm === "todos"
              ? "Mostrando todas as listas e todos os formulários no kanban."
              : `Kanban filtrado para o formulário: ${selectedForm}`
            : selectedForm === "todos"
              ? `Kanban filtrado para a lista: ${selectedList}`
              : `Kanban filtrado para a lista ${selectedList} e formulário ${selectedForm}`}
        </div>

        <div className="w-full text-xs text-muted-foreground">
          Para mover um lead, clique e segure no card e arraste para outra etapa.
        </div>

        <div className="w-full border-t border-border/60 pt-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ir para etapa
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => scrollToStage(stage.id)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={kanbanScrollRef}
          className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sourceStages.map((stage, index) => {
            const stageClients = displayedClients
              .filter((client) => {
                const matchesStage = client.etapa === stage.id;
                const matchesList = selectedList === "todas" || client.lista === selectedList;
                const matchesForm =
                  selectedForm === "todos" || client.formulario === selectedForm;
                return matchesStage && matchesList && matchesForm;
              })
              .sort(
                (firstClient, secondClient) =>
                  new Date(secondClient.ultimaInteracao).getTime() -
                  new Date(firstClient.ultimaInteracao).getTime(),
              );

            return (
              <motion.div
                key={stage.id}
                ref={(element) => {
                  stageRefs.current[stage.id] = element;
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex w-72 shrink-0 flex-col"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                  <span
                    className={cn(
                      "ml-auto stage-badge text-accent-foreground",
                      stage.color,
                    )}
                  >
                    {stageClients.length}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex-1 space-y-3 rounded-xl bg-muted/50 p-3 transition-colors",
                    draggedClient ? "ring-1 ring-primary/20" : "",
                  )}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDropOnStage(stage.id)}
                >
                  {stageClients.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum cliente
                    </p>
                  )}

                  {stageClients.map((client) => (
                    <PipelineCard
                      key={client.id}
                      client={client}
                      templates={sourceTemplates}
                      onOpen={(cardClient) => {
                        setDrawerStartsInEditMode(false);
                        setDrawerInitialSection(null);
                        setSelectedClient(cardClient);
                      }}
                      onSchedule={(cardClient) => {
                        setDrawerStartsInEditMode(true);
                        setDrawerInitialSection("schedule");
                        setSelectedClient(cardClient);
                      }}
                      onMarkSale={(cardClient) => {
                        setDrawerStartsInEditMode(true);
                        setDrawerInitialSection("sale");
                        setSelectedClient(cardClient);
                      }}
                      onDragStart={setDraggedClient}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <ClientDetailDrawer
        client={selectedClient}
        templates={sourceTemplates}
        startInEditMode={drawerStartsInEditMode}
        initialEditSection={drawerInitialSection}
        onClose={() => {
          setDrawerStartsInEditMode(false);
          setDrawerInitialSection(null);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}
