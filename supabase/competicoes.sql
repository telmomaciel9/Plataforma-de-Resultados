-- Várias competições: cada competição é uma linha de app_state (id = endereço /c/<id>).
-- Deixa os admins (utilizadores autenticados) criar competições a partir da app.
-- Correr uma vez no SQL editor do Supabase, depois de policies.sql. Pode correr-se mais do que uma vez.
-- Continua a não haver delete a partir da app: apagar uma competição faz-se aqui, à mão.

drop policy if exists "app_state criar competicoes" on public.app_state;

create policy "app_state criar competicoes"
  on public.app_state for insert
  to authenticated
  with check (true);

-- Para restringir a emails concretos, trocar "with check (true)" por:
--   with check (auth.jwt() ->> 'email' in ('admin1@exemplo.pt', 'admin2@exemplo.pt'))
