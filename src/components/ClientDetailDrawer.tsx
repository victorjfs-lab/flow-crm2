import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, MessageCircle, Phone, Mail, Calendar, User, Tag, FileText, ArrowRight, Pencil, Save, ImagePlus, Trash2 } from "lucide-react";
import { Client, ClientAttachment, MessageTemplate, StageId } from "@/data/types";
import { buildWhatsAppUrl, formatCurrency, formatDate, formatDateTime, FUNNEL_STAGE_ORDER, getClientTemplates, getPrimaryClientMessage, getStageColor, getStageLabel, replaceVariables } from "@/data/crm";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { archiveContact, listContactAttachments, updateContactDetails, uploadContactAttachment } from "@/lib/crm-repository";
import { CrmSnapshot } from "@/lib/crm-loader";
import { useToast } from "@/hooks/use-toast";

const eventIcons: Record<string, any> = {
  movimentacao: ArrowRight,
  nota: FileText,
  whatsapp: MessageCircle,
  ligacao: Phone,
  email: Mail,
};

const editableStageOptions = (Object.entries(FUNNEL_STAGE_ORDER) as [StageId, number][])
  .sort((firstStage, secondStage) => firstStage[1] - secondStage[1])
  .map(([stageId]) => stageId);

export default function ClientDetailDrawer({
  client,
  onClose,
  templates: providedTemplates,
  startInEditMode = false,
  initialEditSection = null,
}: {
  client: Client | null;
  onClose: () => void;
  templates?: MessageTemplate[];
  startInEditMode?: boolean;
  initialEditSection?: "schedule" | "sale" | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [savedPreview, setSavedPreview] = useState<Partial<Client> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scheduleFieldRef = useRef<HTMLLabelElement | null>(null);
  const saleFieldRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    telefone: "",
    formulario: "",
    origem: "",
    observacoes: "",
    etapa: "espera" as StageId,
    lembreteContato: "",
    dataVenda: "",
    produtoVendido: "",
    valorVenda: "",
  });

  useEffect(() => {
    if (!client) {
      return;
    }

    setIsEditing(startInEditMode);
    setSavedPreview(null);
    setSelectedFile(null);
    setFormData({
      email: client.email || "",
      telefone: client.telefone || "",
      formulario: client.formulario || "",
      origem: client.origem || "",
      observacoes: client.observacoes || "",
      etapa: client.etapa,
      lembreteContato: client.lembreteContato ? client.lembreteContato.slice(0, 10) : "",
      dataVenda: client.dataVenda ? client.dataVenda.slice(0, 10) : "",
      produtoVendido: client.produtoVendido || "",
      valorVenda: client.valorVenda != null ? String(client.valorVenda) : "",
    });
  }, [client, startInEditMode]);

  useEffect(() => {
    if (!isEditing || !initialEditSection) {
      return;
    }

    const element =
      initialEditSection === "schedule"
        ? scheduleFieldRef.current
        : saleFieldRef.current;

    if (!element) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [initialEditSection, isEditing, client]);

  const updateMutation = useMutation({
    mutationFn: updateContactDetails,
    onSuccess: async () => {
      setIsEditing(false);
      setSavedPreview({
        email: formData.email,
        telefone: formData.telefone,
        formulario: formData.formulario || "Sem formulario",
        origem: formData.origem,
        observacoes: formData.observacoes,
        etapa: formData.etapa,
        lembreteContato: formData.lembreteContato
          ? `${formData.lembreteContato}T09:00:00.000Z`
          : null,
        dataVenda: formData.dataVenda ? `${formData.dataVenda}T12:00:00.000Z` : null,
        produtoVendido:
          formData.produtoVendido === "smart" || formData.produtoVendido === "mentoria"
            ? formData.produtoVendido
            : null,
        valorVenda: formData.valorVenda ? Number(formData.valorVenda.replace(",", ".")) : null,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-calendario-page"] }),
      ]);
      toast({
        title: "Cliente atualizado",
        description: "As informacoes e observacoes foram salvas no CRM.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar as alteracoes.",
        variant: "destructive",
      });
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["crm-contact-attachments", client?.id],
    enabled: Boolean(client?.id && isSupabaseConfigured),
    queryFn: () => listContactAttachments(client?.id ?? ""),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: uploadContactAttachment,
    onSuccess: async () => {
      setSelectedFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-contact-attachments", client?.id] }),
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
      ]);
      toast({
        title: "Print enviado",
        description: "A imagem foi salva no historico desse cliente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar print",
        description: error instanceof Error ? error.message : "Nao foi possivel enviar a imagem.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveContact,
    onSuccess: async () => {
      const removeClientFromSnapshot = (snapshot: CrmSnapshot | undefined) => {
        if (!snapshot || !client) {
          return snapshot;
        }

        return {
          ...snapshot,
          clients: snapshot.clients.filter((snapshotClient) => snapshotClient.id !== client.id),
        };
      };

      queryClient.setQueryData(["crm-clientes-page"], removeClientFromSnapshot);
      queryClient.setQueryData(["crm-pipeline-page"], removeClientFromSnapshot);
      queryClient.setQueryData(["crm-dashboard-page"], removeClientFromSnapshot);
      queryClient.setQueryData(["crm-renovacoes-page"], removeClientFromSnapshot);
      queryClient.setQueryData(["crm-calendario-page"], removeClientFromSnapshot);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["crm-clientes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-pipeline-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-dashboard-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-renovacoes-page"] }),
        queryClient.invalidateQueries({ queryKey: ["crm-calendario-page"] }),
      ]);
      toast({
        title: "Cliente excluido",
        description: "O cliente foi removido da base visivel do CRM.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Nao foi possivel excluir o cliente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Edicao indisponivel",
        description: "Conecte o Supabase para salvar alteracoes reais.",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync({
      contactId: client.id,
      email: formData.email,
      whatsappPhone: formData.telefone,
      formName: formData.formulario,
      source: formData.origem,
      notes: formData.observacoes,
      nextActionAt: formData.lembreteContato
        ? `${formData.lembreteContato}T09:00:00.000Z`
        : "",
      saleDate: formData.dataVenda ? `${formData.dataVenda}T12:00:00.000Z` : "",
      soldProduct:
        formData.produtoVendido === "smart" || formData.produtoVendido === "mentoria"
          ? formData.produtoVendido
          : "",
      soldAmount: formData.valorVenda,
      stageCode: formData.etapa,
      previousStageCode: client.etapa,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setFormData({
      email: client.email || "",
      telefone: client.telefone || "",
      formulario: client.formulario || "",
      origem: client.origem || "",
      observacoes: client.observacoes || "",
      etapa: client.etapa,
      lembreteContato: client.lembreteContato ? client.lembreteContato.slice(0, 10) : "",
      dataVenda: client.dataVenda ? client.dataVenda.slice(0, 10) : "",
      produtoVendido: client.produtoVendido || "",
      valorVenda: client.valorVenda != null ? String(client.valorVenda) : "",
    });
  };

  const handleUploadAttachment = async () => {
    if (!client || !selectedFile) {
      return;
    }

    if (!isSupabaseConfigured) {
      toast({
        title: "Upload indisponivel",
        description: "Conecte o Supabase para salvar prints do cliente.",
        variant: "destructive",
      });
      return;
    }

    await uploadAttachmentMutation.mutateAsync({
      contactId: client.id,
      file: selectedFile,
    });
  };

  const handleArchive = async () => {
    if (!client) {
      return;
    }

    if (!isSupabaseConfigured) {
      toast({
        title: "Exclusao indisponivel",
        description: "Conecte o Supabase para excluir clientes da base.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir ${client.nome} da base do CRM?`,
    );

    if (!confirmed) {
      return;
    }

    await archiveMutation.mutateAsync(client.id);
  };

  if (!client) return null;

  const displayClient: Client = {
    ...client,
    ...savedPreview,
  };

  const templates = getClientTemplates(displayClient, providedTemplates);
  const mainMsg = getPrimaryClientMessage(displayClient, providedTemplates);
  const canOpenWhatsapp = Boolean(displayClient.telefone && mainMsg);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-in overflow-y-auto bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">{client.nome}</h2>
            <p className="text-xs text-muted-foreground">
              {isEditing ? "Editando informacoes do cliente" : "Detalhes do cliente"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={Phone} label="Telefone" value={displayClient.telefone || "Sem telefone"} />
              <InfoItem icon={Mail} label="Email" value={displayClient.email} />
              <InfoItem icon={Calendar} label="Entrada" value={formatDate(displayClient.dataEntrada)} />
              <InfoItem icon={User} label="Responsavel" value={displayClient.responsavel} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <EditableField
                label="Telefone"
                value={formData.telefone}
                onChange={(value) => setFormData((current) => ({ ...current, telefone: value }))}
                placeholder="Digite o telefone ou WhatsApp"
              />
              <EditableField
                label="Email"
                value={formData.email}
                onChange={(value) => setFormData((current) => ({ ...current, email: value }))}
                placeholder="Digite o email"
              />
              <EditableField
                label="Formulario"
                value={formData.formulario}
                onChange={(value) => setFormData((current) => ({ ...current, formulario: value }))}
                placeholder="Digite o formulario de origem"
              />
              <EditableField
                label="Origem"
                value={formData.origem}
                onChange={(value) => setFormData((current) => ({ ...current, origem: value }))}
                placeholder="Digite a origem do lead"
              />
              <EditableTextarea
                label="Observacoes"
                value={formData.observacoes}
                onChange={(value) => setFormData((current) => ({ ...current, observacoes: value }))}
                placeholder="Digite observacoes sobre esse cliente"
              />
              <EditableDateField
                label="Lembrete para chamar o cliente"
                value={formData.lembreteContato}
                onChange={(value) =>
                  setFormData((current) => ({ ...current, lembreteContato: value }))
                }
                fieldRef={scheduleFieldRef}
              />
              <div ref={saleFieldRef} className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
                <EditableDateField
                  label="Data da venda"
                  value={formData.dataVenda}
                  onChange={(value) => setFormData((current) => ({ ...current, dataVenda: value }))}
                />
                <EditableSelect
                  label="Produto vendido"
                  value={formData.produtoVendido}
                  onChange={(value) => setFormData((current) => ({ ...current, produtoVendido: value }))}
                  options={[
                    { value: "", label: "Selecione" },
                    { value: "smart", label: "Smart" },
                    { value: "mentoria", label: "Mentoria" },
                  ]}
                />
                <EditableField
                  label="Valor vendido"
                  value={formData.valorVenda}
                  onChange={(value) => setFormData((current) => ({ ...current, valorVenda: value }))}
                  placeholder="Ex.: 897"
                />
              </div>
              <EditableSelect
                label="Parte do funil"
                value={formData.etapa}
                onChange={(value) =>
                  setFormData((current) => ({ ...current, etapa: value as StageId }))
                }
                options={editableStageOptions.map((stageId) => ({
                  value: stageId,
                  label: getStageLabel(stageId),
                }))}
              />
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                <InfoItem icon={Calendar} label="Entrada" value={formatDate(displayClient.dataEntrada)} />
                <InfoItem icon={User} label="Responsavel" value={displayClient.responsavel} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className={cn("stage-badge text-accent-foreground", getStageColor(displayClient.etapa))}>
              {getStageLabel(displayClient.etapa)}
            </span>
            <span className="stage-badge border border-border bg-muted text-foreground">{displayClient.lista}</span>
            {displayClient.tags.map((tag) => (
              <span key={tag} className="stage-badge border border-border bg-card text-muted-foreground">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          {!isEditing && displayClient.observacoes && (
            <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Observacoes</p>
              {displayClient.observacoes}
            </div>
          )}

          {!isEditing && displayClient.dayTradeStatus && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Ja opera Day Trade</p>
              {displayClient.dayTradeStatus}
            </div>
          )}

          {!isEditing && displayClient.lembreteContato && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Lembrete de contato
              </p>
              {formatDateTime(displayClient.lembreteContato)}
            </div>
          )}

          {!isEditing && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Ultima interacao</p>
                {formatDateTime(displayClient.ultimaInteracao)}
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Total de prints</p>
                {attachments.length}
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Canal principal</p>
                {displayClient.telefone ? "WhatsApp" : displayClient.email ? "Email" : "Sem canal"}
              </div>
            </div>
          )}

          {!isEditing && (displayClient.dataVenda || displayClient.produtoVendido || displayClient.valorVenda != null) && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Dados da venda</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Data da venda</p>
                  <p>{displayClient.dataVenda ? formatDate(displayClient.dataVenda) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p>{displayClient.produtoVendido === "smart" ? "Smart" : displayClient.produtoVendido === "mentoria" ? "Mentoria" : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p>{displayClient.valorVenda != null ? formatCurrency(displayClient.valorVenda) : "-"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Prints da conversa</h3>
                <p className="text-xs text-muted-foreground">
                  Salve capturas para lembrar detalhes importantes do atendimento.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <ImagePlus className="h-4 w-4" />
                Escolher imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {selectedFile && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                <div className="text-sm text-foreground">{selectedFile.name}</div>
                <button
                  type="button"
                  onClick={() => void handleUploadAttachment()}
                  disabled={uploadAttachmentMutation.isPending}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadAttachmentMutation.isPending ? "Enviando..." : "Salvar print"}
                </button>
              </div>
            )}

            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum print salvo ainda.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <AttachmentCard key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </div>

          {mainMsg && (
            <div className="rounded-xl border-2 border-whatsapp/30 bg-whatsapp/5 p-4">
              <p className="mb-2 text-xs font-semibold text-whatsapp">Mensagem sugerida para WhatsApp</p>
              <p className="mb-3 text-sm text-foreground">{mainMsg}</p>
              {canOpenWhatsapp ? (
                <a
                  href={buildWhatsAppUrl(displayClient.telefone, mainMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2 text-sm font-semibold text-whatsapp-foreground transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar no WhatsApp
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Esse contato ainda nao tem telefone para abrir WhatsApp.</p>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Historico</h3>
            {displayClient.timeline.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro ainda</p>}
            <div className="space-y-3">
              {displayClient.timeline.map((event) => {
                const Icon = eventIcons[event.tipo] || ArrowRight;
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{event.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.autor} | {formatDate(event.data)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {templates.length > 1 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Outras mensagens sugeridas</h3>
              <div className="space-y-2">
                {templates.slice(1).map((template) => (
                  <div key={template.id} className="rounded-lg border border-border p-3 text-sm text-foreground">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{template.nome}</p>
                    {replaceVariables(template.mensagem, displayClient)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Excluir cliente da base</p>
                <p className="text-xs text-muted-foreground">
                  O cliente some do CRM, mas a acao fica registrada no historico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleArchive()}
                disabled={archiveMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {archiveMutation.isPending ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentCard({ attachment }: { attachment: ClientAttachment }) {
  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-border bg-muted/20"
    >
      <div className="aspect-video overflow-hidden bg-muted">
        <img
          src={attachment.fileUrl}
          alt={attachment.fileName}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{attachment.fileName}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(attachment.createdAt)}</p>
      </div>
    </a>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

function EditableTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

function EditableSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditableDateField({
  label,
  value,
  onChange,
  fieldRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fieldRef?: React.RefObject<HTMLLabelElement | null>;
}) {
  return (
    <label ref={fieldRef} className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}
