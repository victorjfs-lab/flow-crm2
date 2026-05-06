import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "HUBSPOT_PRIVATE_APP_TOKEN",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variavel obrigatoria ausente: ${envVar}`);
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

const defaultStageCode = "espera";
const defaultListName = "Contato Inicial";

async function hubspotFetch(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${hubspotToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot ${response.status}: ${text}`);
  }

  return response.json();
}

async function supabaseFetch(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}${endpoint}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  return response;
}

async function getStageIdByCode(code) {
  const response = await supabaseFetch(
    `/rest/v1/pipeline_stages?code=eq.${encodeURIComponent(code)}&select=id,code`,
  );
  const data = await response.json();
  return data[0]?.id ?? null;
}

async function getListIdByName(name) {
  const response = await supabaseFetch(
    `/rest/v1/contact_lists?name=eq.${encodeURIComponent(name)}&select=id,name`,
  );
  const data = await response.json();
  return data[0]?.id ?? null;
}

async function listActiveUsers() {
  const response = await supabaseFetch(
    "/rest/v1/crm_users?is_active=eq.true&select=id,full_name,hubspot_owner_id&order=full_name.asc",
  );
  return response.json();
}

async function listExistingContactsByHubspotIds(hubspotContactIds) {
  if (hubspotContactIds.length === 0) {
    return [];
  }

  const batchSize = 100;
  const results = [];

  for (let index = 0; index < hubspotContactIds.length; index += batchSize) {
    const batch = hubspotContactIds.slice(index, index + batchSize);
    const inFilter = batch.map((id) => `"${String(id)}"`).join(",");

    const response = await supabaseFetch(
      `/rest/v1/contacts?select=id,hubspot_contact_id,current_stage_id,current_list_id,owner_id,notes,source,form_name,entered_at&hubspot_contact_id=in.(${encodeURIComponent(inFilter)})`,
    );

    const data = await response.json();
    results.push(...data);
  }

  return results;
}

function buildFullName(properties) {
  const first = properties.firstname?.trim() ?? "";
  const last = properties.lastname?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || properties.email || properties.phone || "Contato sem nome";
}

function normalizePhone(properties) {
  return (
    properties.hs_whatsapp_phone_number?.trim() ||
    properties.mobilephone?.trim() ||
    properties.phone?.trim() ||
    ""
  );
}

function normalizeFormName(properties) {
  return properties.formulario_de_origem?.trim() || null;
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  if (/^\d+$/.test(String(value))) {
    return new Date(Number(value)).toISOString();
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function normalizeLegacyProperties(rawProperties = {}) {
  return Object.fromEntries(
    Object.entries(rawProperties).map(([key, value]) => [key, value?.value ?? null]),
  );
}

function getLatestFormName(contact, properties) {
  const submissions = Array.isArray(contact["form-submissions"])
    ? contact["form-submissions"]
    : [];

  const latestSubmission = submissions
    .filter((submission) => submission?.title)
    .sort((firstSubmission, secondSubmission) => {
      const firstTimestamp = Number(firstSubmission.timestamp ?? 0);
      const secondTimestamp = Number(secondSubmission.timestamp ?? 0);
      return secondTimestamp - firstTimestamp;
    })[0];

  return latestSubmission?.title?.trim() || normalizeFormName(properties);
}

function getLatestFormSubmissionTimestamp(contact) {
  const submissions = Array.isArray(contact["form-submissions"])
    ? contact["form-submissions"]
    : [];

  const latestSubmission = submissions.sort((firstSubmission, secondSubmission) => {
    const firstTimestamp = Number(firstSubmission.timestamp ?? 0);
    const secondTimestamp = Number(secondSubmission.timestamp ?? 0);
    return secondTimestamp - firstTimestamp;
  })[0];

  return normalizeDateValue(latestSubmission?.timestamp);
}

async function fetchHubspotContacts() {
  const contacts = [];
  let vidOffset = undefined;

  do {
    const params = new URLSearchParams({
      count: "100",
      formSubmissionMode: "all",
      showListMemberships: "true",
    });

    [
      "firstname",
      "lastname",
      "email",
      "phone",
      "mobilephone",
      "hs_whatsapp_phone_number",
      "formulario_de_origem",
      "day_trade_status",
      "createdate",
      "hubspot_owner_id",
    ].forEach((property) => {
      params.append("property", property);
    });

    if (vidOffset) {
      params.set("vidOffset", String(vidOffset));
    }

    const data = await hubspotFetch(
      `https://api.hubapi.com/contacts/v1/lists/all/contacts/all?${params.toString()}`,
    );

    contacts.push(...(data.contacts ?? []));
    vidOffset = data["has-more"] ? data["vid-offset"] : undefined;
  } while (vidOffset);

  return contacts;
}

async function upsertContacts(records) {
  const response = await supabaseFetch("/rest/v1/contacts?on_conflict=hubspot_contact_id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(records),
  });

  return response.json();
}

export async function syncHubspotContacts() {
  const stageId = await getStageIdByCode(defaultStageCode);
  const listId = await getListIdByName(defaultListName);
  const users = await listActiveUsers();

  if (!stageId) {
    throw new Error(`Nao encontrei a etapa padrao "${defaultStageCode}" no Supabase.`);
  }

  const hubspotContacts = await fetchHubspotContacts();
  const existingContacts = await listExistingContactsByHubspotIds(
    hubspotContacts.map((contact) => String(contact.vid ?? contact["canonical-vid"] ?? "")),
  );
  const existingContactsByHubspotId = new Map(
    existingContacts.map((contact) => [String(contact.hubspot_contact_id), contact]),
  );

  const records = hubspotContacts
    .map((contact, index) => {
      const properties = normalizeLegacyProperties(contact.properties ?? {});
      const hubspotContactId = String(contact.vid ?? contact["canonical-vid"] ?? "");
      const existingContact = existingContactsByHubspotId.get(hubspotContactId);
      const whatsappPhone = normalizePhone(properties);
      const safeWhatsappPhone = whatsappPhone || null;
      const formName = getLatestFormName(contact, properties);
      const createdAt =
        normalizeDateValue(properties.createdate) ||
        normalizeDateValue(contact.addedAt) ||
        new Date().toISOString();
      const latestInteractionAt = getLatestFormSubmissionTimestamp(contact) || createdAt;
      const mappedOwner =
        users.find(
          (user) =>
            user.hubspot_owner_id && user.hubspot_owner_id === properties.hubspot_owner_id,
        ) ||
        users[index % Math.max(users.length, 1)] ||
        null;

      return {
        full_name: buildFullName(properties),
        first_name: properties.firstname?.trim() || null,
        email: properties.email?.trim() || null,
        whatsapp_phone: safeWhatsappPhone,
        form_name: formName || existingContact?.form_name || null,
        day_trade_status: properties.day_trade_status?.trim() || null,
        source: existingContact?.source || "HubSpot",
        notes: existingContact?.notes || "Importado do HubSpot",
        current_stage_id: existingContact?.current_stage_id || stageId,
        current_list_id: existingContact?.current_list_id || listId,
        owner_id: existingContact?.owner_id || mappedOwner?.id || null,
        hubspot_contact_id: hubspotContactId,
        hubspot_owner_id: properties.hubspot_owner_id || null,
        hubspot_last_synced_at: new Date().toISOString(),
        entered_at: existingContact?.entered_at || createdAt,
        last_interaction_at: latestInteractionAt,
      };
    })
    .filter(Boolean);

  if (records.length === 0) {
    return {
      imported: 0,
      found: hubspotContacts.length,
    };
  }

  const result = await upsertContacts(records);

  return {
    imported: result.length,
    found: hubspotContacts.length,
  };
}
