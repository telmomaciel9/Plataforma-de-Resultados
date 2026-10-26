import { redirect } from "next/navigation";
import config from "@/tournament.config.json";

// Endereço antigo (antes de haver várias competições): as equipas eram da competição de 2026.
export default function LegacyTeamPage({ params }) {
  redirect(`/c/${config.id}/equipa/${params.slug}`);
}
