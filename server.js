import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { syncHubspotContacts } from "./server/hubspot-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 3001);
const envPath = path.join(rootDir, ".env");

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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("As variaveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const app = express();

async function requireAuthenticatedUser(request, response, next) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({
      ok: false,
      message: "Sessao invalida. Entre no CRM para continuar.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.email) {
    response.status(401).json({
      ok: false,
      message: "Nao foi possivel validar sua sessao.",
    });
    return;
  }

  const { data: crmUsers, error: crmUsersError } = await supabaseAdmin
    .from("crm_users")
    .select("id,email,is_active")
    .eq("email", data.user.email)
    .eq("is_active", true)
    .limit(1);

  if (crmUsersError || !crmUsers?.length) {
    response.status(403).json({
      ok: false,
      message: "Seu usuario nao tem acesso liberado ao CRM.",
    });
    return;
  }

  request.crmUser = crmUsers[0];
  request.authUser = data.user;
  next();
}

app.get("/api/health", (_request, response) => {
  response.status(200).json({ ok: true });
});

app.post("/api/sync/hubspot", requireAuthenticatedUser, async (_request, response) => {
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
