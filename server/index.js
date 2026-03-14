import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";
import { syncHubspotContacts } from "./hubspot-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 3001);

function ensureDistBuild() {
  if (fs.existsSync(distDir)) {
    return;
  }

  const viteBin = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");

  if (!fs.existsSync(viteBin)) {
    throw new Error("Nao foi possivel encontrar o Vite para gerar o build de producao.");
  }

  console.log("Build do front nao encontrado. Gerando dist automaticamente...");
  execFileSync(process.execPath, [viteBin, "build"], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}

ensureDistBuild();

const app = express();

app.get("/api/health", (_request, response) => {
  response.status(200).json({ ok: true });
});

app.post("/api/sync/hubspot", async (_request, response) => {
  try {
    const result = await syncHubspotContacts();
    response.status(200).json({
      ok: true,
      message: "Contatos sincronizados com sucesso.",
      ...result,
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Erro ao sincronizar contatos.",
    });
  }
});

app.use(express.static(distDir));

app.get("*", (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Servidor Flow CRM online na porta ${port}`);
});
