-- Tempo real e controlo de versão para app_state.
-- Correr uma vez no SQL editor do Supabase. Pode correr-se mais do que uma vez.
-- A app continua a funcionar antes de isto ser aplicado (sem tempo real e sem
-- proteção contra gravações simultâneas).

-- 1. Versão da linha: cada gravação incrementa-a. A app grava com
--    "where version = <a que leu>", por isso se outro admin gravou entretanto a
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

-- 2. Tempo real: envia as alterações de app_state a quem tem o site aberto.
--    O Realtime respeita a RLS de policies.sql, por isso só envia o que se pode ler.
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
