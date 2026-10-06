import React from 'react';
import { Text } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { countCups } from '@/api/utils/ruleMoveCups';
import Player from '@/components/MatchPlayers/Player';
import MenuSection from '@/components/Menu/MenuSection';
import { useNextTokens } from '@/components/next/tokens';
import { plural } from '@/utils/format';
import { useNewDesign } from '@/zustand/localSettingsStore';

export interface MatchPlayersProps {
    editable?: boolean;
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;
    onPlayerPress: (player: TeamMember) => void;
    /** each player's Elo change with this match, by season player id */
    eloChanges?: Map<string, number>;
}
export default function MatchPlayers({
    editable,
    players,
    setMoveCount,
    onPlayerPress,
    eloChanges,
}: MatchPlayersProps) {
    const newDesign = useNewDesign();
    const t = useNextTokens();

    const redTeam = players.filter((i) => i.team === 'red');
    const blueTeam = players.filter((i) => i.team === 'blue');

    const redTeamCups = countCups(redTeam.flatMap((i) => i.moves));
    const blueTeamCups = countCups(blueTeam.flatMap((i) => i.moves));

    const blueTitle = `Blue Team - ${plural(blueTeamCups, 'cup', 'cups')}`;
    const redTitle = `Red Team - ${plural(redTeamCups, 'cup', 'cups')}`;

    return (
        <>
            <MenuSection
                title={
                    newDesign ? (
                        <Text
                            style={{
                                fontSize: 17,
                                fontWeight: '700',
                                color: t.blue,
                            }}
                        >
                            {blueTitle}
                        </Text>
                    ) : (
                        blueTitle
                    )
                }
            >
                {blueTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        border={idx !== 0}
                        player={i}
                        expanded={false}
                        setIsExpanded={() => {}} // unused, the items used to be expandable
                        onPress={() => onPlayerPress(i)}
                        editable={editable}
                        setMoveCount={setMoveCount}
                        eloChange={eloChanges?.get(i.id)}
                    />
                ))}
            </MenuSection>

            <MenuSection
                title={
                    newDesign ? (
                        <Text
                            style={{
                                fontSize: 17,
                                fontWeight: '700',
                                color: t.red,
                            }}
                        >
                            {redTitle}
                        </Text>
                    ) : (
                        redTitle
                    )
                }
            >
                {redTeam.map((i, idx) => (
                    <Player
                        key={idx}
                        border={idx !== 0}
                        player={i}
                        expanded={false}
                        setIsExpanded={() => {}} // unused, the items used to be expandable
                        onPress={() => onPlayerPress(i)}
                        editable={editable}
                        setMoveCount={setMoveCount}
                        eloChange={eloChanges?.get(i.id)}
                    />
                ))}
            </MenuSection>
        </>
    );
}
