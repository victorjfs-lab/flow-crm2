import { supabase } from "@/lib/supabase";

const CLIENT_PRINTS_BUCKET = "client-prints";

export async function listStages() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("is_active", true)
    .order("stage_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listContactLists() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("contact_lists")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listWhatsappTemplates() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listUsers() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("crm_users")
    .select("*")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listContacts() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("is_archived", false)
    .order("entered_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listInteractionsByContactIds(contactIds: string[]) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  if (contactIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("contact_interactions")
    .select("*")
    .in("contact_id", contactIds)
    .order("happened_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listContactAttachments(contactId: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("contact_attachments")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    createdAt: row.created_at,
  }));
}

async function getStageByCode(code: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, code")
    .eq("code", code)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    code: data.code,
  };
}

export async function updateWhatsappTemplate(templateId: string, body: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .update({
      body,
    })
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function uploadContactAttachment({
  contactId,
  file,
}: {
  contactId: string;
  file: File;
}) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${contactId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_PRINTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(CLIENT_PRINTS_BUCKET)
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData.publicUrl;

  const { data, error } = await supabase
    .from("contact_attachments")
    .insert({
      contact_id: contactId,
      file_name: file.name,
      file_path: filePath,
      file_url: fileUrl,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: interactionError } = await supabase
    .from("contact_interactions")
    .insert({
      contact_id: contactId,
      interaction_type: "note",
      description: `Print anexado ao cliente: ${file.name}`,
    });

  if (interactionError) throw interactionError;

  return data;
}

export async function moveContactToStage({
  contactId,
  fromStageCode,
  toStageCode,
}: {
  contactId: string;
  fromStageCode: string;
  toStageCode: string;
}) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const [fromStage, toStage] = await Promise.all([
    getStageByCode(fromStageCode),
    getStageByCode(toStageCode),
  ]);

  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      current_stage_id: toStage.id,
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (updateError) throw updateError;

  const { error: historyError } = await supabase
    .from("contact_stage_history")
    .insert({
      contact_id: contactId,
      from_stage_id: fromStage.id,
      to_stage_id: toStage.id,
      reason: "Movido no kanban",
    });

  if (historyError) throw historyError;

  const { error: interactionError } = await supabase
    .from("contact_interactions")
    .insert({
      contact_id: contactId,
      interaction_type: "movement",
      description: `Movido de ${fromStage.code} para ${toStage.code} no kanban`,
    });

  if (interactionError) throw interactionError;
}

export async function updateContactDetails({
  contactId,
  email,
  whatsappPhone,
  formName,
  source,
  notes,
  nextActionAt,
  saleDate,
  soldProduct,
  soldAmount,
  stageCode,
  previousStageCode,
}: {
  contactId: string;
  email: string;
  whatsappPhone: string;
  formName: string;
  source: string;
  notes: string;
  nextActionAt?: string;
  saleDate?: string;
  soldProduct?: "smart" | "mentoria" | "";
  soldAmount?: string;
  stageCode?: string;
  previousStageCode?: string;
}) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  let stageId: string | null = null;

  if (stageCode) {
    const stage = await getStageByCode(stageCode);
    stageId = stage.id;
  }

  const payload: Record<string, string | number | null> = {
    email: email.trim() || null,
    whatsapp_phone: whatsappPhone.trim() || null,
    form_name: formName.trim() || null,
    source: source.trim() || null,
    notes: notes.trim() || null,
    next_action_at: nextActionAt || null,
    sale_date: saleDate || null,
    sold_product: soldProduct || null,
    sold_amount: soldAmount ? Number(soldAmount.replace(",", ".")) : null,
    last_interaction_at: new Date().toISOString(),
  };

  if (stageId) {
    payload.current_stage_id = stageId;
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw error;

  const { error: interactionError } = await supabase
    .from("contact_interactions")
    .insert({
      contact_id: contactId,
      interaction_type: "note",
      description:
        stageCode && previousStageCode && stageCode !== previousStageCode
          ? "Informacoes do contato e etapa atualizadas no CRM"
          : "Informacoes do contato atualizadas no CRM",
    });

  if (interactionError) throw interactionError;

  if (stageCode && previousStageCode && stageCode !== previousStageCode) {
    const [fromStage, toStage] = await Promise.all([
      getStageByCode(previousStageCode),
      getStageByCode(stageCode),
    ]);

    const { error: historyError } = await supabase
      .from("contact_stage_history")
      .insert({
        contact_id: contactId,
        from_stage_id: fromStage.id,
        to_stage_id: toStage.id,
        reason: "Movido pelo detalhe do cliente",
      });

    if (historyError) throw historyError;
  }

  return data;
}

export async function createWhatsappTemplate({
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
}) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  let stageId: string | null = null;
  let listId: string | null = null;

  if (scopeType === "stage") {
    if (!stageCode) {
      throw new Error("Selecione uma etapa para criar o template.");
    }

    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("code", stageCode)
      .single();

    if (stageError) throw stageError;
    stageId = stage.id;
  }

  if (scopeType === "list") {
    if (!listName) {
      throw new Error("Selecione uma lista para criar o template.");
    }

    const { data: list, error: listError } = await supabase
      .from("contact_lists")
      .select("id")
      .eq("name", listName)
      .single();

    if (listError) throw listError;
    listId = list.id;
  }

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .insert({
      name,
      scope_type: scopeType,
      stage_id: stageId,
      list_id: listId,
      body,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveContact(contactId: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) throw error;

  const { error: interactionError } = await supabase
    .from("contact_interactions")
    .insert({
      contact_id: contactId,
      interaction_type: "system",
      description: "Cliente removido da base do CRM",
    });

  if (interactionError) throw interactionError;
}

export async function updatePipelineStages(
  stages: Array<{ code: string; name: string; stageOrder: number }>,
) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  for (const stage of stages) {
    const { error } = await supabase
      .from("pipeline_stages")
      .update({
        name: stage.name,
        stage_order: stage.stageOrder,
      })
      .eq("code", stage.code);

    if (error) throw error;
  }
}

export async function updateContactLists(
  lists: Array<{ previousName: string; name: string }>,
) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  for (const list of lists) {
    const { error } = await supabase
      .from("contact_lists")
      .update({
        name: list.name,
      })
      .eq("name", list.previousName);

    if (error) throw error;
  }
}

export async function updateCrmUsers(
  users: Array<{ previousName: string; fullName: string }>,
) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  for (const user of users) {
    const { error } = await supabase
      .from("crm_users")
      .update({
        full_name: user.fullName,
      })
      .eq("full_name", user.previousName);

    if (error) throw error;
  }
}

export async function createContactList(name: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { error } = await supabase
    .from("contact_lists")
    .insert({
      name,
      is_active: true,
    });

  if (error) throw error;
}

export async function archiveContactList(name: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { error } = await supabase
    .from("contact_lists")
    .update({
      is_active: false,
    })
    .eq("name", name);

  if (error) throw error;
}

export async function createCrmUser(fullName: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const emailSlug = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  const { error } = await supabase
    .from("crm_users")
    .insert({
      full_name: fullName,
      email: `${emailSlug || "usuario"}.${Date.now()}@flowcrm.local`,
      role: "agent",
      is_active: true,
    });

  if (error) throw error;
}

export async function archiveCrmUser(fullName: string) {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  const { error } = await supabase
    .from("crm_users")
    .update({
      is_active: false,
    })
    .eq("full_name", fullName);

  if (error) throw error;
}
