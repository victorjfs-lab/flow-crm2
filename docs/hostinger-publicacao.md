# Publicacao na Hostinger

## Estrutura

O projeto agora tem duas partes:

- Frontend React/Vite
- Backend Node com rota segura para sincronizar o HubSpot

## Rotas do backend

- `GET /api/health`
- `POST /api/sync/hubspot`

## Variaveis de ambiente

No servidor da Hostinger, configure:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HUBSPOT_PRIVATE_APP_TOKEN=
PORT=3001
```

## Comandos

Para desenvolvimento local:

```bash
npm run dev
npm run dev:server
```

Para producao:

```bash
npm install
npm run build
npm start
```

## Fluxo na Hostinger

1. Subir os arquivos do projeto
2. Configurar as variaveis de ambiente
3. Rodar `npm install`
4. Rodar `npm run build`
5. Iniciar com `npm start`
6. Confirmar que o botao `Atualizar contatos` chama `/api/sync/hubspot`

## Observacao importante

O token do HubSpot fica apenas no backend. O frontend nunca deve expor essa chave.
