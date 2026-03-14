import { syncHubspotContacts } from "../server/hubspot-sync.mjs";

async function main() {
  console.log("Buscando contatos do HubSpot...");
  const result = await syncHubspotContacts();
  console.log(`Contatos encontrados no HubSpot: ${result.found}`);
  console.log(`Importacao concluida. Registros retornados: ${result.imported}`);
}

main().catch((error) => {
  console.error("Erro na importacao:", error.message);
  process.exitCode = 1;
});
