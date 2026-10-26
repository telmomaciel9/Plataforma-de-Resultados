// Gera supabase/novo-torneio.sql a partir de tournament.config.json.
// Uso: npm run novo-torneio, e depois correr o ficheiro gerado no SQL editor do Supabase.
// Precisa de Node 22.18 ou mais recente, que corre TypeScript diretamente.
import { readFile, writeFile } from "node:fs/promises";
import { emptyTournament } from "../lib/tournament/config.ts";

const config = JSON.parse(await readFile(new URL("../tournament.config.json", import.meta.url), "utf8"));

let state;
try {
  state = emptyTournament(config);
} catch (error) {
  console.error(`tournament.config.json tem problemas: ${error.message}`);
  process.exit(1);
}

const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;

const sql = `-- Torneio "${config.title}" (${config.modalities.join(", ")}; grupos ${config.groups.join(", ")}).
-- Gerado por scripts/novo-torneio.mjs. Não substitui um torneio que já exista com o mesmo id.
insert into public.app_state (id, payload)
values (${sqlText(config.id)}, ${sqlText(JSON.stringify(state))}::jsonb)
on conflict (id) do nothing;
`;

const out = new URL("../supabase/novo-torneio.sql", import.meta.url);
await writeFile(out, sql, "utf8");
console.log(`Criado supabase/novo-torneio.sql para "${config.title}" (id ${config.id}).`);
console.log("Corre-o no SQL editor do Supabase e faz deploy com este tournament.config.json.");
