import React, { useState } from "react";
import { useNavigation } from "expo-router";

import { theme } from "@/theme";
import MenuSection from "../Menu/MenuSection";
import Player from "./Player";

export interface MatchPlayersProps {
  editable?: boolean;
}
export default function MatchPlayers({ editable }: MatchPlayersProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const navigation = useNavigation();

  return (
    <>
      <MenuSection title="Red Team - 30 points">
        <Player
          team="red"
          name="Bolls"
          points={3}
          change={0.12}
          expanded={expandedId === "1"}
          setIsExpanded={(value) => setExpandedId(value ? "1" : null)}
          editable={editable}
        />
        <Player
          team="red"
          name="Institut"
          points={3}
          change={0.12}
          expanded={expandedId === "2"}
          setIsExpanded={(value) => setExpandedId(value ? "2" : null)}
          editable={editable}
        />
        <Player
          team="red"
          name="Jonas"
          points={3}
          change={-0.12}
          expanded={expandedId === "3"}
          setIsExpanded={(value) => setExpandedId(value ? "3" : null)}
          editable={editable}
        />
      </MenuSection>

      <MenuSection title="Blue Team - 9 points">
        <Player
          team="blue"
          name="Laurin"
          points={3}
          change={0.12}
          expanded={expandedId === "4"}
          setIsExpanded={(value) => setExpandedId(value ? "4" : null)}
          editable={editable}
        />
        <Player
          team="blue"
          name="Ole"
          points={3}
          change={0.12}
          expanded={expandedId === "5"}
          setIsExpanded={(value) => setExpandedId(value ? "5" : null)}
          editable={editable}
        />
        <Player
          team="blue"
          name="Robert"
          points={3}
          change={0.12}
          expanded={expandedId === "6"}
          setIsExpanded={(value) => setExpandedId(value ? "6" : null)}
          editable={editable}
        />
      </MenuSection>
    </>
  );
}
