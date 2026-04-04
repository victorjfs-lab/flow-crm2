import { Client, MessageTemplate, Stage } from "@/data/types";
import { hydrateStageLabels } from "@/data/crm";
import { mapContactRowToClient, mapInteractionRowToTimelineEvent, mapStageRowToStage, mapTemplateRowToMessageTemplate } from "@/lib/crm-mappers";
import { listContactLists, listContacts, listInteractionsByContactIds, listStages, listUsers, listWhatsappTemplates } from "@/lib/crm-repository";

export interface CrmSnapshot {
  clients: Client[];
  stages: Stage[];
  listas: string[];
  responsaveis: string[];
  templates: MessageTemplate[];
}

export async function loadCrmSnapshot(): Promise<CrmSnapshot> {
  const [contactRows, stageRows, listRows, userRows, templateRows] = await Promise.all([
    listContacts(),
    listStages(),
    listContactLists(),
    listUsers(),
    listWhatsappTemplates(),
  ]);

  const stagesById = Object.fromEntries(stageRows.map((stage) => [stage.id, stage]));
  const listsById = Object.fromEntries(listRows.map((list) => [list.id, list]));
  const ownersById = Object.fromEntries(
    userRows.map((user) => [user.id, { full_name: user.full_name }]),
  );

  let interactionRows: Awaited<ReturnType<typeof listInteractionsByContactIds>> = [];

  try {
    interactionRows = await listInteractionsByContactIds(contactRows.map((contact) => contact.id));
  } catch (error) {
    console.warn("Nao foi possivel carregar o historico dos contatos.", error);
  }

  const mappedStages = stageRows
    .map(mapStageRowToStage)
    .sort((firstStage, secondStage) => firstStage.order - secondStage.order);

  hydrateStageLabels(mappedStages);

  const timelineByContactId = interactionRows.reduce<Record<string, Client["timeline"]>>(
    (accumulator, row) => {
      if (!accumulator[row.contact_id]) {
        accumulator[row.contact_id] = [];
      }

      accumulator[row.contact_id].push(mapInteractionRowToTimelineEvent(row, ownersById));
      return accumulator;
    },
    {},
  );

  return {
    clients: contactRows.map((row) =>
      mapContactRowToClient(
        row,
        stagesById,
        listsById,
        ownersById,
        timelineByContactId[row.id] ?? [],
      ),
    ),
    stages: mappedStages,
    listas: listRows.map((list) => list.name),
    responsaveis: userRows.map((user) => user.full_name),
    templates: templateRows.map((template) =>
      mapTemplateRowToMessageTemplate(template, stagesById, listsById),
    ),
  };
}
