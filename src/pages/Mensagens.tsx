import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Plus } from "lucide-react";
import { messageTemplates, listas as mockListas, stages as mockStages } from "@/data/mockData";
import { MessageTemplate, StageId } from "@/data/types";
import { cn } from "@/lib/utils";
import { getStageColor, getStageLabel } from "@/data/crm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCrmSnapshot } from "@/lib/crm-loader";
import { createWhatsappTemplate, updateWhatsappTemplate } from "@/lib/crm-repository";
import { useToast } from "@/hooks/use-toast";

export default function Mensagens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["crm-mensagens-page"],
    enabled: isSupabaseConfigured,
    queryFn: loadCrmSnapshot,
  });

  const sourceTemplates = isSupabaseConfigured ? (remoteData?.templates ?? []) : messageTemplates;
  const sourceStages = isSupabaseConfigured ? (remoteData?.stages ?? []) : mockStages;
  const sourceListas = isSupabaseConfigured ? (remoteData?.listas ?? []) : mockListas;
  const [templates, setTemplates] = useState<MessageTemplate[]>(sourceTemplates);
  const [selected, setSelected] = useState<MessageTemplate | null>(sourceTemplates[0] || null);
  const [editText, setEditText] = useState(sourceTemplates[0]?.mensagem || "");
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateScope, setNewTemplateScope] = useState<"stage" | "list">("stage");
  const [newTemplateStage, setNewTemplateStage] = useState<string>(sourceStages[0]?.id ?? "novo");
  const [newTemplateList, setNewTemplateList] = useState<string>(sourceListas[0] ?? "");

  const saveTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      body,
    }: {
      templateId: string;
      body: string;
    }) => updateWhatsappTemplate(templateId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-mensagens-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
      ]);

      toast({
        title: "Template salvo",
        description: "A mensagem foi atualizada no Supabase.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar o template.",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async ({
      name,
      scopeType,
      body,
      stageCode,
      listName,
    }: {
      name: string;
      scopeType: "stage" | "list";
      body: string;
      stageCode?: string;
      listName?: string;
    }) =>
      createWhatsappTemplate({
        name,
        scopeType,
        body,
        stageCode,
        listName,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-mensagens-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
      ]);

      toast({
        title: "Template criado",
        description: "O novo template foi salvo no Supabase.",
      });
      setIsCreating(false);
      setNewTemplateName("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar",
        description: error instanceof Error ? error.message : "Nao foi possivel criar o template.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    setTemplates(sourceTemplates);
    if (isCreating) {
      return;
    }
    setSelected((current) => {
      if (!current) {
        return sourceTemplates[0] || null;
      }

      return sourceTemplates.find((template) => template.id === current.id) || sourceTemplates[0] || null;
    });
  }, [isCreating, sourceTemplates]);

  useEffect(() => {
    setEditText(selected?.mensagem || "");
  }, [selected]);

  useEffect(() => {
    if (sourceStages.length > 0) {
      setNewTemplateStage((current) => current || sourceStages[0].id);
    }
    if (sourceListas.length > 0) {
      setNewTemplateList((current) => current || sourceListas[0]);
    }
  }, [sourceListas, sourceStages]);

  const handleSelect = (template: MessageTemplate) => {
    setIsCreating(false);
    setSelected(template);
    setEditText(template.mensagem);
  };

  const handleSave = async () => {
    if (!selected) return;

    const updatedTemplate = { ...selected, mensagem: editText };

    setTemplates((previous) =>
      previous.map((template) =>
        template.id === selected.id ? updatedTemplate : template,
      ),
    );
    setSelected(updatedTemplate);

    if (!isSupabaseConfigured) {
      toast({
        title: "Salvo localmente",
        description: "O template foi atualizado apenas na tela porque o Supabase nao esta configurado.",
      });
      return;
    }

    await saveTemplateMutation.mutateAsync({
      templateId: selected.id,
      body: editText,
    });
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Nome obrigatorio",
        description: "Preencha o nome do template antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (!editText.trim()) {
      toast({
        title: "Mensagem obrigatoria",
        description: "Escreva a mensagem do novo template antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase necessario",
        description: "Para criar template novo, deixe o Supabase configurado.",
        variant: "destructive",
      });
      return;
    }

    await createTemplateMutation.mutateAsync({
      name: newTemplateName.trim(),
      scopeType: newTemplateScope,
      body: editText,
      stageCode: newTemplateScope === "stage" ? newTemplateStage : undefined,
      listName: newTemplateScope === "list" ? newTemplateList : undefined,
    });
  };

  const previewText = useMemo(() => {
    return editText
      .replace(/NAME/g, "Joao")
      .replace(/LISTA/g, isCreating ? (newTemplateScope === "list" ? newTemplateList : "Espera Smart Flow") : (selected?.lista ?? "Espera Smart Flow"))
      .replace(/ETAPA/g, isCreating ? (newTemplateScope === "stage" ? getStageLabel(newTemplateStage as StageId) : "Contato Inicial") : (selected?.etapa ? getStageLabel(selected.etapa) : "Contato Inicial"))
      .replace(/RESPONSAVEL/g, "Ana Silva");
  }, [editText, isCreating, newTemplateList, newTemplateScope, newTemplateStage, selected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
        <p className="text-muted-foreground">Configure mensagens de WhatsApp por etapa e lista</p>
        {isSupabaseConfigured && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? "Carregando templates do Supabase..."
              : "Templates carregados do Supabase e prontos para editar ou criar."}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Templates</h3>
            <button
              onClick={() => {
                setIsCreating(true);
                setSelected(null);
                setNewTemplateName("");
                setEditText("");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo template
            </button>
          </div>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                selected?.id === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{template.nome}</p>
              <div className="mt-1 flex gap-2">
                {template.etapa && (
                  <span className={cn("stage-badge text-accent-foreground", getStageColor(template.etapa as StageId))}>
                    {getStageLabel(template.etapa as StageId)}
                  </span>
                )}
                {template.lista && (
                  <span className="stage-badge border border-border bg-muted text-foreground">{template.lista}</span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{template.mensagem}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-3">
          {selected || isCreating ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-6">
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                {isCreating ? "Novo template" : selected?.nome}
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {isCreating
                  ? "Crie um novo template e escolha se ele pertence a uma etapa ou a uma lista."
                  : "Edite a mensagem abaixo. Use as variaveis disponiveis."}
              </p>

              {isCreating && (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <input
                    value={newTemplateName}
                    onChange={(event) => setNewTemplateName(event.target.value)}
                    placeholder="Nome do template"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <select
                    value={newTemplateScope}
                    onChange={(event) => setNewTemplateScope(event.target.value as "stage" | "list")}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="stage">Template por etapa</option>
                    <option value="list">Template por lista</option>
                  </select>
                  {newTemplateScope === "stage" ? (
                    <select
                      value={newTemplateStage}
                      onChange={(event) => setNewTemplateStage(event.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {sourceStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={newTemplateList}
                      onChange={(event) => setNewTemplateList(event.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {sourceListas.map((lista) => (
                        <option key={lista} value={lista}>
                          {lista}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {["NAME", "LISTA", "ETAPA", "RESPONSAVEL"].map((variable) => (
                  <button
                    key={variable}
                    onClick={() => setEditText((previous) => `${previous} ${variable}`)}
                    className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    {variable}
                  </button>
                ))}
              </div>

              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-4 rounded-xl border-2 border-whatsapp/30 bg-whatsapp/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-whatsapp" />
                  <span className="text-xs font-semibold text-whatsapp">Preview da mensagem</span>
                </div>
                <p className="text-sm text-foreground">{previewText}</p>
              </div>

              <button
                onClick={isCreating ? handleCreateTemplate : handleSave}
                disabled={saveTemplateMutation.isPending || createTemplateMutation.isPending}
                className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {saveTemplateMutation.isPending || createTemplateMutation.isPending
                  ? "Salvando..."
                  : isCreating
                    ? "Criar template"
                    : "Salvar alteracoes"}
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Selecione um template para editar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
