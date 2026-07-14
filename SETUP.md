# CajuSpace — Setup do zero (banco novo + deploy)

O schema do banco **não estava versionado** neste repositório. Ele foi reconstruído a
partir do código (camada `app/lib/repository` + `app/api`) e agora vive em:

- `supabase/migrations/001_init.sql` — tabelas, relações, índices, RLS e bucket de Storage
- `supabase/seed.sql` — dados de demonstração (fictícios, LGPD-safe)

## 1. Criar o projeto no Supabase
1. https://supabase.com → New project (guarde a senha do banco).
2. Em **Project Settings → API**, copie: `Project URL`, `anon public` e `service_role`.

## 2. Criar o schema
1. Supabase Studio → **SQL Editor** → New query.
2. Cole todo o `supabase/migrations/001_init.sql` → **Run**.
3. (Opcional, recomendado para demonstração) Cole `supabase/seed.sql` → **Run**.
4. Confira em **Storage** se o bucket **`spaces`** foi criado (público).

## 3. Variáveis de ambiente
Copie `.env.example` → `.env.local` e preencha:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` → gere: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_PIN` → escolha um PIN

## 4. Rodar local
```bash
npm install
npm run dev
```
- **Login da equipe/admin:** email `admin@cajuspace.local` + o PIN definido em `ADMIN_PIN`.
- **Cliente:** cadastro/login por CPF/CNPJ (o seed já traz 3 clientes fictícios).

## 5. Deploy na Vercel
1. https://vercel.com → New Project → importe o repositório `CajuSpace`.
2. Em **Settings → Environment Variables**, adicione as 5 variáveis do `.env.local`
   (marque Production + Preview + Development).
3. Deploy. A cada push na `main` a Vercel reconstrói.

## Notas de segurança
- O `SUPABASE_SERVICE_ROLE_KEY` só é usado no servidor (route handlers). Nunca exponha no client.
- **RLS**: habilitado em todas as tabelas sem policies (deny-all). Todo acesso é server-side
  via `service_role`, que ignora RLS. O browser só usa Storage — não lê tabelas.
- **Upload de imagem de espaço** hoje é feito no browser com a *anon key* (bucket `spaces`
  com policies de escrita anônima). Melhoria futura: mover o upload para uma route server-side
  com `service_role` e remover as policies anônimas de insert/update/delete (ver comentário no
  final do `001_init.sql`).
