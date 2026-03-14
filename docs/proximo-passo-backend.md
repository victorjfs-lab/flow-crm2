# Proximo passo backend

## O que ja esta pronto

- front visual do CRM
- base mockada
- schema SQL para Supabase

## O que eu recomendo fazer agora

1. Criar o projeto no Supabase
2. Executar o arquivo `supabase/schema.sql`
3. Criar as variaveis de ambiente do projeto
4. Instalar o client do Supabase
5. Ligar a pagina de clientes primeiro

## Ordem tecnica ideal

### Etapa 1

Conectar:

- `Clientes`
- `Pipeline`

Essas duas telas ja entregam muito valor.

### Etapa 2

Conectar:

- `Mensagens`
- `ClientDetailDrawer`

### Etapa 3

Criar importacao do HubSpot

## Variaveis de ambiente esperadas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Nota importante

Como voce e iniciante, eu evitaria agora:

- autenticao complexa
- sincronizacao bidirecional com HubSpot
- automacao de WhatsApp por API oficial

O caminho mais inteligente e:

- banco funcionando
- front lendo dados reais
- depois importacao do HubSpot
