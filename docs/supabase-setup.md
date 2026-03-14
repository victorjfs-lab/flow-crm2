# Setup do Supabase

## O que foi adicionado

- `.env.example`
- `src/lib/supabase.ts`
- `src/lib/crm-repository.ts`
- `src/lib/crm-mappers.ts`
- `src/integrations/supabase/types.ts`

## Como usar

1. Crie um arquivo `.env`
2. Copie os valores de `.env.example`
3. Preencha:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Dependencia

O projeto agora espera a biblioteca:

- `@supabase/supabase-js`

## Proximo passo recomendado

Depois de instalar as dependencias, o ideal e conectar primeiro:

- tela de `Clientes`
- tela de `Pipeline`

## Observacao

Neste ambiente eu nao consegui rodar `npm install`, entao a dependencia foi adicionada no `package.json`, mas nao foi instalada nem validada em execucao aqui.
