import dayjs from 'dayjs';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { eloChangeOf } from '@/api/calls/matchHooks';
import { env } from '@/api/env';
import { Match, TeamMember } from '@/api/utils/matchDtoToMatch';
import { EloChange } from '@/components/EloChange';
import { Icon } from '@/components/Icon';
import { Team } from '@/components/MatchVsHeader';
import { useNextTokens } from '@/components/next/tokens';
import { TournamentLabel } from '@/components/tournament/TournamentLabel';
import { MatchEloDto } from '@/openapi/openapi';

function TeamSide({
    color,
    players,
    isWinner,
    highlightedId,
    elo,
}: {
    color: 'blue' | 'red';
    players: TeamMember[];
    isWinner: boolean;
    highlightedId?: string;
    elo?: MatchEloDto;
}) {
    const t = useNextTokens();

    return (
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Team
                players={players}
                color={color}
                maxItems={3}
                size={34}
                centered
                highlightedId={highlightedId}
            />
            <Text
                numberOfLines={2}
                style={{
                    textAlign: 'center',
                    fontSize: 13,
                    lineHeight: 17,
                    color: isWinner ? t.text : t.textSecondary,
                    fontWeight: isWinner ? '600' : '400',
                }}
            >
                {players.map((p, idx) => (
                    <Text
                        key={p.id}
                        style={
                            highlightedId && p.profileId === highlightedId
                                ? { color: t[color], fontWeight: '700' }
                                : undefined
                        }
                    >
                        {idx > 0 ? ', ' : ''}
                        {p.name || 'Unknown'}
                        <EloChange value={eloChangeOf(elo, p.id)} />
                    </Text>
                ))}
            </Text>
        </View>
    );
}

/**
 * A match as a card: each team on its side with its players' names and Elo changes, the score
 * in the middle with the winner's cups in their team color. New Design only.
 */
export function NextMatchCard({
    match,
    onPress,
    highlightedId,
    elo,
}: {
    match: Match;
    onPress: () => void;
    highlightedId?: string;
    elo?: MatchEloDto;
}) {
    const t = useNextTokens();

    const winner =
        match.winnerTeamId == null
            ? null
            : match.winnerTeamId === match.blueTeamId
              ? 'blue'
              : 'red';

    const scoreStyle = (side: 'blue' | 'red') => ({
        fontSize: 30,
        fontWeight: '700' as const,
        fontVariant: ['tabular-nums' as const],
        color: winner === side ? t[side] : t.textSecondary,
    });

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
                marginBottom: 10,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: t.radius,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: pressed ? t.surfacePressed : t.surface,
            })}
        >
            <TournamentLabel
                id={match.tournamentId}
                stage={match.tournamentStage}
            />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <TeamSide
                    color="blue"
                    players={match.blueTeam}
                    isWinner={winner === 'blue'}
                    highlightedId={highlightedId}
                    elo={elo}
                />
                <View
                    style={{
                        alignItems: 'center',
                        minWidth: 92,
                        paddingTop: 2,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: t.textSecondary,
                            fontVariant: ['tabular-nums'],
                        }}
                    >
                        {env.format.date.matchHour(dayjs(match.date))}
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Text style={scoreStyle('blue')}>{match.blueCups}</Text>
                        <Text style={{ fontSize: 22, color: t.textSecondary }}>
                            :
                        </Text>
                        <Text style={scoreStyle('red')}>{match.redCups}</Text>
                    </View>
                    {winner && (
                        <Icon
                            name="crown"
                            size={14}
                            color={t[winner]}
                            style={{
                                alignSelf:
                                    winner === 'blue'
                                        ? 'flex-start'
                                        : 'flex-end',
                                marginHorizontal: 18,
                            }}
                        />
                    )}
                </View>
                <TeamSide
                    color="red"
                    players={match.redTeam}
                    isWinner={winner === 'red'}
                    highlightedId={highlightedId}
                    elo={elo}
                />
            </View>
        </Pressable>
    );
}
