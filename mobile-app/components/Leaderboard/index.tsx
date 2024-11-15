import React from "react";

import Podium, { Player } from "../Podium";
import { ThemedView } from "../ThemedView";
import LeaderboardPlayerItem from "./LeaderboardPlayerItem";

export interface LeaderboardProps {
  players: Player[];
}
export default function Leaderboard({ players }: LeaderboardProps) {
  const nonPodiumPlayers = players.slice(3);

  return (
    <>
      <Podium
        firstPlace={players[0]}
        secondPlace={players[1]}
        thirdPlace={players[2]}
      />
      <ThemedView
        style={{
          alignSelf: "stretch",
          // paddingHorizontal: 16,
          paddingTop: 14,
        }}
      >
        {nonPodiumPlayers.map((i, idx) => (
          <LeaderboardPlayerItem
            key={idx}
            name={i.name}
            placement={idx + 3}
            points={i.points}
            matches={i.matches}
            elo={i.elo}
            matchesWon={i.matchesWon}
          />
        ))}
      </ThemedView>
    </>
  );
}
