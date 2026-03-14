# Banco de dados do Flow CRM

## Objetivo

Essa base foi pensada para 3 coisas ao mesmo tempo:

- alimentar o front visual do CRM
- guardar historico real de movimentacoes
- permitir sincronizacao futura com HubSpot sem gambiarra

## Arquivo principal

Use o schema em:

- `supabase/schema.sql`

## Tabelas principais

### `crm_users`

Guarda a equipe que usa o sistema.

Campos principais:

- nome
- email
- papel
- telefone WhatsApp
- `hubspot_owner_id`

### `pipeline_stages`

Guarda as etapas do funil.

Exemplos:

- Novo Lead
- Contato Inicial
- Espera Smart Flow
- Proposta Enviada

### `contact_lists`

Representa as listas do HubSpot ou listas internas do CRM.

Campos importantes:

- nome da lista
- descricao
- `hubspot_list_id`

### `contacts`

E a tabela principal do CRM.

Ela guarda:

- nome
- telefone
- email
- origem
- observacoes
- etapa atual
- lista atual
- responsavel
- data de entrada
- ultima interacao
- `hubspot_contact_id`

### `whatsapp_templates`

Guarda as mensagens prontas.

Ela funciona com dois escopos:

- por etapa
- por lista

Regra que combinamos:

- mensagem por `lista` deve ter prioridade sobre mensagem por `etapa`

### `contact_interactions`

Guarda timeline do cliente.

Tipos sugeridos:

- nota
- whatsapp
- call
- email
- movement

### `contact_stage_history`

Guarda cada troca de etapa do cliente.

### `contact_list_history`

Guarda cada troca de lista.

### `hubspot_sync_log`

Guarda o historico de sincronizacao com HubSpot.

Isso ajuda muito quando der erro de importacao ou atualizacao.

## Como o front usa isso

O front atual pode ser ligado assim:

- dashboard: `contacts`, `pipeline_stages`, `contact_interactions`
- pipeline: `contacts` + `pipeline_stages`
- clientes: `contacts` + `contact_lists` + `crm_users`
- mensagens: `whatsapp_templates`
- drawer do cliente: `contacts` + `contact_interactions` + `contact_stage_history`

## Ordem recomendada de implementacao

1. Criar o projeto no Supabase
2. Rodar `supabase/schema.sql`
3. Validar se as tabelas nasceram
4. Popular alguns contatos de teste
5. Conectar o front ao Supabase
6. Depois integrar HubSpot

## Como pensar na integracao com HubSpot

A ideia mais segura para o seu caso e:

1. HubSpot continua sendo a origem inicial
2. O Flow CRM importa e organiza visualmente
3. Cada contato salvo no Flow CRM guarda o `hubspot_contact_id`
4. Cada lista guarda o `hubspot_list_id`
5. Cada responsavel pode guardar o `hubspot_owner_id`

Assim, depois fica facil:

- importar contatos
- atualizar status
- puxar listas
- evitar duplicidade

## MVP de sincronizacao

No inicio eu recomendo:

1. importar contatos do HubSpot para o banco
2. mostrar tudo no CRM visual
3. usar o WhatsApp por link dinamico

So depois:

1. sincronizar mudanca de etapa
2. sincronizar mudanca de lista
3. automatizar importacoes
