-- Base de dados da plataforma de resultados (Supabase).
-- Correr no SQL editor do Supabase. Pode correr-se mais do que uma vez: numa base de
-- dados que já tem tudo, não muda nada.

-- 1. Tabela: cada competição é uma linha; o id é o endereço (/c/<id>) e o payload é
--    o documento JSON com modalidades, grupos, jogos e fase final.
create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- 2. Versão da linha: cada gravação incrementa-a. A app grava com
--    "where version = <a que leu>", por isso, se outro admin gravou entretanto, a
--    gravação não acontece e a app volta a aplicar as alterações por cima.
alter table public.app_state add column if not exists version bigint not null default 1;

create or replace function public.app_state_bump_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_bump_version on public.app_state;
create trigger app_state_bump_version
  before update on public.app_state
  for each row execute function public.app_state_bump_version();

-- 3. Permissões (RLS). A chave anon é pública (vai no código do browser), por isso estas
--    regras são o que impede alguém de fora de alterar os resultados.
alter table public.app_state enable row level security;

drop policy if exists "app_state leitura publica" on public.app_state;
drop policy if exists "app_state escrita admins" on public.app_state;
drop policy if exists "app_state criar competicoes" on public.app_state;

-- Toda a gente lê os resultados.
create policy "app_state leitura publica"
  on public.app_state for select
  to anon, authenticated
  using (true);

-- Só os admins (utilizadores criados em Authentication → Users) gravam e criam
-- competições. Não há delete: apagar uma competição faz-se aqui, à mão:
--   delete from public.app_state where id = '<id>';
create policy "app_state escrita admins"
  on public.app_state for update
  to authenticated
  using (true)
  with check (true);

create policy "app_state criar competicoes"
  on public.app_state for insert
  to authenticated
  with check (true);

-- Para restringir a emails concretos, trocar "using (true)" / "with check (true)" por:
--   (auth.jwt() ->> 'email' in ('admin1@exemplo.pt', 'admin2@exemplo.pt'))

-- 4. Tempo real: envia as alterações a quem tem o site aberto. O Realtime respeita a
--    RLS acima, por isso só envia o que se pode ler.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end;
$$;
