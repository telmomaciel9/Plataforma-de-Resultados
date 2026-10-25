-- Políticas de acesso à tabela app_state.
-- A chave anon é pública (vai no código do browser), por isso estas regras são
-- a única coisa que impede alguém de fora de alterar os resultados.
-- Correr uma vez no SQL editor do Supabase.

alter table public.app_state enable row level security;

-- Remove políticas antigas com o mesmo nome, se existirem.
drop policy if exists "app_state leitura publica" on public.app_state;
drop policy if exists "app_state escrita admins" on public.app_state;

-- Toda a gente pode ler os resultados.
create policy "app_state leitura publica"
  on public.app_state for select
  to anon, authenticated
  using (true);

-- Só utilizadores autenticados (os admins criados em Authentication → Users)
-- podem atualizar. Não há políticas de insert nem delete, por isso ninguém
-- pode criar ou apagar linhas a partir da app.
create policy "app_state escrita admins"
  on public.app_state for update
  to authenticated
  using (true)
  with check (true);

-- Para restringir a emails concretos, trocar "using (true) with check (true)" por:
--   using (auth.jwt() ->> 'email' in ('admin1@exemplo.pt', 'admin2@exemplo.pt'))
--   with check (auth.jwt() ->> 'email' in ('admin1@exemplo.pt', 'admin2@exemplo.pt'))
