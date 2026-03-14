import { syncHubspotContacts } from "../server/hubspot-sync.js";

async function main() {
  console.log("Buscando contatos do HubSpot...");
  const result = await syncHubspotContacts();
  console.log(`Contatos encontrados no HubSpot: ${result.found}`);
  console.log(`Importando ${result.found} contatos para o Supabase...`);
  console.log(`Importacao concluida. Registros retornados: ${result.imported}`);
}

main().catch((error) => {
  console.error("Erro na importacao:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
