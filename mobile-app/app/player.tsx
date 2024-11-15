import { mockMatches } from "@/components/mockData/matches";
import PlayerScreen from "@/components/screens/Player";

export default function Page() {
  return (
    <PlayerScreen
      placement={6}
      name="Bolls"
      elo={216}
      matchesWon={23}
      points={211}
      hasPremium={false}
      pastSeasons={1}
      matches={mockMatches}
    />
  );
}
