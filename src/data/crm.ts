import { clients, messageTemplates, stages } from "./mockData";
import { Activity, Client, MessageTemplate, StageId } from "./types";

export const TODAY = "2026-03-13";
export const FUNNEL_STAGE_LABELS: Record<StageId, string> = {
  clientes_novos: "Clear",
  clientes_velhos: "Low",
  novo: "Continua Smart",
  contato: "Fechados 5C",
  espera: "Leads",
  acompanhamento: "Em negociação",
  proposta: "Prontos para fechar",
  fechado: "Fechados Smart",
  perdido: "Perdido",
};

const stageLabelOverrides: Partial<Record<StageId, string>> = {};

export const FUNNEL_STAGE_ORDER: Record<StageId, number> = {
  espera: 1,
  clientes_novos: 2,
  acompanhamento: 3,
  clientes_velhos: 4,
  proposta: 5,
  fechado: 6,
  contato: 7,
  novo: 8,
  perdido: 9,
};

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getPriorityMeta(client: Client) {
  const now = new Date();
  const lastInteraction = new Date(client.ultimaInteracao);
  const nextReminder = client.lembreteContato ? new Date(client.lembreteContato) : null;
  const renewalReminder = getRenewalReminderDate(client);
  const renewalDate = renewalReminder ? new Date(renewalReminder) : null;
  const hoursSinceLastInteraction =
    (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);

  if (
    (nextReminder && nextReminder <= now) ||
    (renewalDate && renewalDate <= now)
  ) {
    return {
      label: "Urgente",
      tone: "bg-destructive/10 text-destructive border-destructive/30",
    };
  }

  if (hoursSinceLastInteraction <= 24) {
    return {
      label: "Quente",
      tone: "bg-whatsapp/10 text-whatsapp border-whatsapp/30",
    };
  }

  if (hoursSinceLastInteraction <= 72) {
    return {
      label: "Morno",
      tone: "bg-stage-espera/10 text-stage-espera border-stage-espera/30",
    };
  }

  return {
    label: "Frio",
    tone: "bg-muted text-muted-foreground border-border",
  };
}

export function hydrateStageLabels(
  sourceStages: Array<{ id: StageId; label: string }>,
) {
  for (const stage of sourceStages) {
    stageLabelOverrides[stage.id] = stage.label;
  }
}

export function getStageLabel(etapa: StageId): string {
  return (
    stageLabelOverrides[etapa] ??
    FUNNEL_STAGE_LABELS[etapa] ??
    stages.find((stage) => stage.id === etapa)?.label ??
    etapa
  );
}

export function getStageColor(etapa: StageId): string {
  const map: Record<StageId, string> = {
    clientes_novos: "bg-stage-clientes-novos",
    clientes_velhos: "bg-stage-clientes-velhos",
    novo: "bg-stage-novo",
    contato: "bg-stage-contato",
    espera: "bg-stage-espera",
    acompanhamento: "bg-stage-acompanhamento",
    proposta: "bg-stage-proposta",
    fechado: "bg-stage-fechado",
    perdido: "bg-stage-perdido",
  };

  return map[etapa];
}

export function buildWhatsAppUrl(telefone: string, mensagem: string): string {
  const cleanPhone = telefone.replace(/\D/g, "");
  const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

export function replaceVariables(template: string, client: Client): string {
  return template
    .replace(/NAME/g, client.nome.split(" ")[0])
    .replace(/LISTA/g, client.lista)
    .replace(/ETAPA/g, getStageLabel(client.etapa))
    .replace(/RESPONSAVEL/g, client.responsavel);
}

export function getClientTemplates(
  client: Client,
  templates: MessageTemplate[] = messageTemplates,
): MessageTemplate[] {
  const listTemplates = templates.filter((template) => template.lista === client.lista);
  const stageTemplates = templates.filter(
    (template) => template.etapa === client.etapa && template.lista !== client.lista,
  );
  const genericTemplates = templates.filter(
    (template) => !template.lista && !template.etapa,
  );

  return [...listTemplates, ...stageTemplates, ...genericTemplates];
}

export function getPrimaryClientMessage(
  client: Client,
  templates: MessageTemplate[] = messageTemplates,
) {
  const template = getClientTemplates(client, templates)[0];

  if (template) {
    return replaceVariables(template.mensagem, client);
  }

  return `Oi NAME, tudo bem? Aqui e RESPONSAVEL. Estou entrando em contato para dar sequencia ao seu atendimento.`.replace(
    /NAME|RESPONSAVEL/g,
    (variable) =>
      variable === "NAME" ? client.nome.split(" ")[0] : client.responsavel,
  );
}

export function getClientMetrics(sourceClients: Client[] = clients) {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const monthlySalesValue = sourceClients.reduce((total, client) => {
    if (!client.dataVenda || client.valorVenda == null) {
      return total;
    }

    const saleDate = new Date(client.dataVenda);
    if (saleDate.getMonth() !== today.getMonth() || saleDate.getFullYear() !== today.getFullYear()) {
      return total;
    }

    return total + client.valorVenda;
  }, 0);

  const smartSalesCount = sourceClients.filter((client) => {
    if (client.produtoVendido !== "smart" || !client.dataVenda) {
      return false;
    }

    const saleDate = new Date(client.dataVenda);
    return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
  }).length;

  const mentoringSalesCount = sourceClients.filter((client) => {
    if (client.produtoVendido !== "mentoria" || !client.dataVenda) {
      return false;
    }

    const saleDate = new Date(client.dataVenda);
    return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
  }).length;

  const renewalCount = getRenewalCandidates(sourceClients).length;

  return {
    total: sourceClients.length,
    novosHoje: sourceClients.filter((client) => client.dataEntrada.startsWith(todayDate)).length,
    aguardandoContato: sourceClients.filter(
      (client) => client.etapa === "novo" || client.etapa === "contato",
    ).length,
    emEspera: sourceClients.filter((client) => client.etapa === "espera").length,
    propostasAbertas: sourceClients.filter((client) => client.etapa === "proposta").length,
    vendasMes: monthlySalesValue,
    vendasMesFormatadas: formatCurrency(monthlySalesValue),
    smartVendidoMes: smartSalesCount,
    mentoriaVendidaMes: mentoringSalesCount,
    renovacoesPendentes: renewalCount,
  };
}

export function getClientCategorySummary(sourceClients: Client[] = clients) {
  const summary = {
    indicadorFree: 0,
    clear: 0,
    low: 0,
    outros: 0,
  };

  for (const client of sourceClients) {
    if (client.categoriaCliente === "Indicador Free") {
      summary.indicadorFree += 1;
      continue;
    }

    if (client.categoriaCliente === "Clear") {
      summary.clear += 1;
      continue;
    }

    if (client.categoriaCliente === "Low") {
      summary.low += 1;
      continue;
    }

    if (client.categoriaCliente === "Outros") {
      summary.outros += 1;
    }
  }

  return summary;
}

export function getStageDistribution(
  sourceStages = stages,
  sourceClients: Client[] = clients,
) {
  return sourceStages.map((stage) => ({
    ...stage,
    count: sourceClients.filter((client) => client.etapa === stage.id).length,
  }));
}

export function getNextActionLabel(client: Client) {
  const labels: Record<StageId, string> = {
    clientes_novos: "Qualificar cliente Clear",
    clientes_velhos: "Qualificar lead Low",
    novo: "Continuar acompanhamento Smart",
    contato: "Acompanhar cliente 5C",
    espera: "Fazer primeiro contato",
    acompanhamento: "Negociar proposta",
    proposta: "Conduzir fechamento",
    fechado: "Iniciar onboarding Smart",
    perdido: "Marcar reengajamento",
  };

  return labels[client.etapa];
}

export function getRecentActivities(sourceClients: Client[] = clients, limit = 5): Activity[] {
  return [...sourceClients]
    .flatMap((client) =>
      client.timeline.map((event) => ({
        id: `${client.id}-${event.id}`,
        clienteNome: client.nome,
        clienteId: client.id,
        tipo: event.tipo,
        descricao: event.descricao,
        data: event.data,
        responsavel: event.autor,
      })),
    )
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limit);
}

export function getFormConversionSummary(sourceClients: Client[] = clients) {
  const forms = new Map<string, { leads: number; vendas: number }>();

  for (const client of sourceClients) {
    const formName = client.formulario || "Sem formulario";
    const current = forms.get(formName) ?? { leads: 0, vendas: 0 };
    current.leads += 1;

    if (client.produtoVendido && client.valorVenda != null) {
      current.vendas += 1;
    }

    forms.set(formName, current);
  }

  return [...forms.entries()]
    .map(([formulario, summary]) => ({
      formulario,
      leads: summary.leads,
      vendas: summary.vendas,
      conversao:
        summary.leads > 0 ? Math.round((summary.vendas / summary.leads) * 100) : 0,
    }))
    .sort((firstForm, secondForm) => secondForm.vendas - firstForm.vendas || secondForm.leads - firstForm.leads)
    .slice(0, 6);
}

export function getRenewalReminderDate(client: Client) {
  if (client.produtoVendido !== "smart" || !client.dataVenda) {
    return null;
  }

  const saleDate = new Date(client.dataVenda);
  const cycleEndDate = new Date(saleDate);
  cycleEndDate.setMonth(cycleEndDate.getMonth() + 5);

  const reminderDate = new Date(cycleEndDate);
  reminderDate.setDate(reminderDate.getDate() - 7);

  return reminderDate.toISOString();
}

export function getRenewalCandidates(sourceClients: Client[] = clients) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return sourceClients
    .filter((client) => client.produtoVendido === "smart" && client.dataVenda)
    .map((client) => {
      const reminderDate = getRenewalReminderDate(client);
      if (!reminderDate) {
        return null;
      }

      const cycleEndDate = new Date(client.dataVenda as string);
      cycleEndDate.setMonth(cycleEndDate.getMonth() + 5);

      return {
        client,
        reminderDate,
        cycleEndDate: cycleEndDate.toISOString(),
      };
    })
    .filter((entry): entry is { client: Client; reminderDate: string; cycleEndDate: string } => Boolean(entry))
    .filter((entry) => new Date(entry.reminderDate) <= todayEnd)
    .sort(
      (firstEntry, secondEntry) =>
        new Date(firstEntry.cycleEndDate).getTime() - new Date(secondEntry.cycleEndDate).getTime(),
    );
}
