import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { listas, responsaveis, stages } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";
import {
  archiveContactList,
  archiveCrmUser,
  createContactList,
  createCrmUser,
  updateContactLists,
  updateCrmUsers,
  updatePipelineStages,
} from "@/lib/crm-repository";
import { useToast } from "@/hooks/use-toast";

type ConfigTab = "etapas" | "listas" | "responsaveis";

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConfigTab>("etapas");
  const [stageForm, setStageForm] = useState<Array<{ code: string; label: string; color: string; order: number }>>([]);
  const [listForm, setListForm] = useState<string[]>([]);
  const [userForm, setUserForm] = useState<string[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["crm-configuracoes-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceStages = remoteData?.stages?.length ? remoteData.stages : stages;
  const sourceListas = remoteData?.listas?.length ? remoteData.listas : listas;
  const sourceResponsaveis =
    remoteData?.responsaveis?.length ? remoteData.responsaveis : responsaveis;

  useEffect(() => {
    setStageForm(
      sourceStages.map((stage) => ({
        code: stage.id,
        label: stage.label,
        color: stage.color,
        order: stage.order,
      })),
    );
  }, [sourceStages]);

  useEffect(() => {
    setListForm(sourceListas);
  }, [sourceListas]);

  useEffect(() => {
    setUserForm(sourceResponsaveis);
  }, [sourceResponsaveis]);

  const tabs = [
    { id: "etapas" as const, label: "Etapas do Funil" },
    { id: "listas" as const, label: "Listas" },
    { id: "responsaveis" as const, label: "Responsaveis" },
  ];

  const reloadQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["crm-configuracoes-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-calendario-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-mensagens-page"] }),
    ]);
  };

  const stageMutation = useMutation({
    mutationFn: updatePipelineStages,
    onSuccess: async () => {
      await reloadQueries();
      toast({
        title: "Etapas salvas",
        description: "Os nomes do funil foram atualizados no CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar etapas",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar as etapas.",
        variant: "destructive",
      });
    },
  });

  const listMutation = useMutation({
    mutationFn: updateContactLists,
    onSuccess: async () => {
      await reloadQueries();
      toast({
        title: "Listas salvas",
        description: "As listas foram atualizadas no CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar listas",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar as listas.",
        variant: "destructive",
      });
    },
  });

  const userMutation = useMutation({
    mutationFn: updateCrmUsers,
    onSuccess: async () => {
      await reloadQueries();
      toast({
        title: "Responsaveis salvos",
        description: "Os nomes da equipe foram atualizados no CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar responsaveis",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar os responsaveis.",
        variant: "destructive",
      });
    },
  });

  const isSaving =
    stageMutation.isPending || listMutation.isPending || userMutation.isPending;

  const createListMutation = useMutation({
    mutationFn: createContactList,
    onSuccess: async () => {
      setNewListName("");
      await reloadQueries();
      toast({
        title: "Lista criada",
        description: "A nova lista foi adicionada ao CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar lista",
        description: error instanceof Error ? error.message : "Nao foi possivel criar a lista.",
        variant: "destructive",
      });
    },
  });

  const archiveListMutation = useMutation({
    mutationFn: archiveContactList,
    onSuccess: async () => {
      await reloadQueries();
      toast({
        title: "Lista excluida",
        description: "A lista foi removida das configuracoes ativas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir lista",
        description: error instanceof Error ? error.message : "Nao foi possivel excluir a lista.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createCrmUser,
    onSuccess: async () => {
      setNewUserName("");
      await reloadQueries();
      toast({
        title: "Responsavel criado",
        description: "O novo responsavel foi adicionado ao CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar responsavel",
        description: error instanceof Error ? error.message : "Nao foi possivel criar o responsavel.",
        variant: "destructive",
      });
    },
  });

  const archiveUserMutation = useMutation({
    mutationFn: archiveCrmUser,
    onSuccess: async () => {
      await reloadQueries();
      toast({
        title: "Responsavel excluido",
        description: "O responsavel foi removido das configuracoes ativas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir responsavel",
        description: error instanceof Error ? error.message : "Nao foi possivel excluir o responsavel.",
        variant: "destructive",
      });
    },
  });

  const currentTabDescription = useMemo(() => {
    if (activeTab === "etapas") {
      return "Configure as etapas do seu funil de vendas.";
    }

    if (activeTab === "listas") {
      return "Gerencie suas listas de clientes.";
    }

    return "Gerencie os responsaveis da equipe comercial.";
  }, [activeTab]);

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Salvar indisponivel",
        description: "Conecte o Supabase para salvar as configuracoes.",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "etapas") {
      await stageMutation.mutateAsync(
        stageForm.map((stage, index) => ({
          code: stage.code,
          name: stage.label.trim(),
          stageOrder: index + 1,
        })),
      );
      return;
    }

    if (activeTab === "listas") {
      await listMutation.mutateAsync(
        sourceListas.map((listName, index) => ({
          previousName: listName,
          name: listForm[index]?.trim() || listName,
        })),
      );
      return;
    }

    await userMutation.mutateAsync(
      sourceResponsaveis.map((userName, index) => ({
        previousName: userName,
        fullName: userForm[index]?.trim() || userName,
      })),
    );
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      return;
    }

    await createListMutation.mutateAsync(newListName.trim());
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      return;
    }

    await createUserMutation.mutateAsync(newUserName.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
        <p className="text-muted-foreground">Personalize etapas, listas e equipe</p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading ? "Carregando configuracoes do Supabase..." : "Configuracoes conectadas ao Supabase."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-border">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="mb-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <p className="mb-4 text-sm text-muted-foreground">{currentTabDescription}</p>

        {activeTab === "etapas" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              As etapas do funil podem ser renomeadas aqui. Adicionar ou excluir etapas fica bloqueado por enquanto para nao quebrar o fluxo do CRM.
            </div>
            {stageForm.map((stage, index) => (
              <div key={stage.code} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                <div className={cn("h-4 w-4 rounded-full", stage.color)} />
                <input
                  value={stage.label}
                  onChange={(event) =>
                    setStageForm((current) =>
                      current.map((currentStage) =>
                        currentStage.code === stage.code
                          ? { ...currentStage, label: event.target.value }
                          : currentStage,
                      ),
                    )
                  }
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === "listas" && (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-dashed border-border p-4">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Nova lista"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => void handleCreateList()}
                disabled={createListMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>

            {listForm.map((listName, index) => (
              <div key={`${listName}-${index}`} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <input
                  value={listName}
                  onChange={(event) =>
                    setListForm((current) =>
                      current.map((currentList, currentIndex) =>
                        currentIndex === index ? event.target.value : currentList,
                      ),
                    )
                  }
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void archiveListMutation.mutateAsync(listName)}
                  disabled={archiveListMutation.isPending}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "responsaveis" && (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-dashed border-border p-4">
              <input
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                placeholder="Novo responsavel"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => void handleCreateUser()}
                disabled={createUserMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>

            {userForm.map((userName, index) => (
              <div key={`${userName}-${index}`} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {(userName || "?")
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <input
                  value={userName}
                  onChange={(event) =>
                    setUserForm((current) =>
                      current.map((currentUser, currentIndex) =>
                        currentIndex === index ? event.target.value : currentUser,
                      ),
                    )
                  }
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void archiveUserMutation.mutateAsync(userName)}
                  disabled={archiveUserMutation.isPending}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
