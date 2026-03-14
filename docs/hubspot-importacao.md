# Importacao inicial do HubSpot

## Objetivo

Esse fluxo faz uma primeira importacao dos contatos do HubSpot para o Supabase.

Nesta primeira versao, o importador:

- busca contatos no HubSpot
- importa nome, email, telefone, formulario e owner
- salva no Supabase
- evita duplicidade usando `hubspot_contact_id`

## Arquivos criados

- `scripts/import-hubspot-contacts.mjs`
- `docs/hubspot-importacao.md`

## Variaveis que precisam existir no `.env`

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HUBSPOT_PRIVATE_APP_TOKEN`

## Onde pegar cada uma

### Supabase

No Supabase:

1. `Project Settings`
2. `API`
3. copie a `service_role key`

Use a `service_role` no importador, nao a `anon`.

### HubSpot

Use o token do private app que voce acabou de criar.

## Como rodar

No terminal, dentro do projeto:

```cmd
cd /d C:\Users\User\Documents\Playground\flow-crm-src\flow-crm-main
npm run import:hubspot
```

## Regra desta primeira versao

Todo contato importado entra por padrao em:

- etapa: `contato`
- lista: `Contato Inicial`

Depois a gente pode evoluir para:

- puxar listas reais do HubSpot
- mapear lista por criterio
- sincronizar atualizacoes automaticas

## Campos importados

- `firstname`
- `lastname`
- `email`
- `phone`
- `mobilephone`
- `hs_whatsapp_phone_number`
- `formulario_de_origem`
- `createdate`
- `hubspot_owner_id`

## Observacao importante

O importador agora aceita contatos sem telefone.

Regras atuais:

- `hs_whatsapp_phone_number` tem prioridade para preencher `whatsapp_phone`
- `formulario_de_origem` alimenta `form_name`
- `source` fica como `HubSpot`
