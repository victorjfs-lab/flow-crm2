import { Client, MessageTemplate, Stage, TimelineEvent } from "@/data/types";
import { FUNNEL_STAGE_LABELS, FUNNEL_STAGE_ORDER } from "@/data/crm";
import type { Database } from "@/integrations/supabase/types";

type StageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];
type ListRow = Database["public"]["Tables"]["contact_lists"]["Row"];
type TemplateRow = Database["public"]["Tables"]["whatsapp_templates"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type InteractionRow = Database["public"]["Tables"]["contact_interactions"]["Row"];

export function mapStageRowToStage(row: StageRow): Stage {
  const stageId = row.code as Stage["id"];
  return {
    id: stageId,
    label: row.name || FUNNEL_STAGE_LABELS[stageId] || stageId,
    color: row.color_token,
    order: FUNNEL_STAGE_ORDER[stageId] ?? row.stage_order,
  };
}

export function mapTemplateRowToMessageTemplate(
  row: TemplateRow,
  stagesById: Record<string, StageRow>,
  listsById: Record<string, ListRow>,
): MessageTemplate {
  return {
    id: row.id,
    nome: row.name,
    mensagem: row.body,
    etapa: row.stage_id ? (stagesById[row.stage_id]?.code as MessageTemplate["etapa"]) : undefined,
    lista: row.list_id ? listsById[row.list_id]?.name : undefined,
  };
}

export function mapContactRowToClient(
  row: ContactRow,
  stagesById: Record<string, StageRow>,
  listsById: Record<string, ListRow>,
  ownersById: Record<string, { full_name: string }>,
  timeline: TimelineEvent[] = [],
): Client {
  const stage = stagesById[row.current_stage_id];
  const list = row.current_list_id ? listsById[row.current_list_id] : null;
  const owner = row.owner_id ? ownersById[row.owner_id] : null;

  return {
    id: row.id,
    nome: row.full_name,
    telefone: row.whatsapp_phone ?? "",
    email: row.email ?? "",
    formulario: row.form_name?.trim() || "Sem formulario",
    lista: list?.name ?? "Sem lista",
    etapa: (stage?.code as Client["etapa"]) ?? "novo",
    dataEntrada: row.entered_at,
    ultimaInteracao: row.last_interaction_at ?? row.entered_at,
    lembreteContato: row.next_action_at,
    dataVenda: row.sale_date,
    produtoVendido: row.sold_product,
    valorVenda: row.sold_amount,
    dayTradeStatus: row.day_trade_status,
    responsavel: owner?.full_name ?? "Sem responsavel",
    origem: row.source ?? "",
    observacoes: row.notes ?? "",
    tags: [],
    timeline,
  };
}

export function mapInteractionRowToTimelineEvent(
  row: InteractionRow,
  ownersById: Record<string, { full_name: string }>,
): TimelineEvent {
  const typeMap: Record<InteractionRow["interaction_type"], TimelineEvent["tipo"]> = {
    note: "nota",
    whatsapp: "whatsapp",
    call: "ligacao",
    email: "email",
    movement: "movimentacao",
    system: "nota",
  };

  return {
    id: row.id,
    tipo: typeMap[row.interaction_type],
    descricao: row.description,
    data: row.happened_at,
    autor: row.created_by ? ownersById[row.created_by]?.full_name ?? "Sistema" : "Sistema",
  };
}
