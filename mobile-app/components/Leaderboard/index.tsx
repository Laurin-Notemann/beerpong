import { LegendList, LegendListProps } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import LeaderboardPlayerItem from '@/components/Leaderboard/LeaderboardPlayerItem';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import NextLeaderboardRow from '@/components/next/NextLeaderboardRow';
import { NextPodium } from '@/components/next/NextPodium';
import Podium from '@/components/Podium';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';
import { plural } from '@/utils/format';
import { useNewDesign } from '@/zustand/localSettingsStore';

type LeaderboardRow =
    | { type: 'player'; player: Player; placement: number; unranked: boolean }
    | { type: 'unrankedHeader' };

export interface LeaderboardProps extends Pick<
    LegendListProps<LeaderboardRow>,
    'style' | 'contentContainerStyle' | 'refreshControl' | 'scrollEnabled'
> {
    players: Player[];

    withPodium?: boolean;
    showUnranked?: boolean;

    onPlayerPress?: (id: string) => void;

    season?: {
        name: string;
        startDate: string;
        endDate?: string;
        numPlayers: number;
        numMatches: number;
    };
    minMatchesRequiredToBeRanked: number;
    /** rendered above the season info and podium */
    ListHeaderComponent?: React.ReactElement;
    ListFooterComponent?: React.ReactElement;
    /** shown instead of the podium while nobody is ranked */
    podiumEmptyComponent?: React.ReactNode;
    rankingAlgorithm?: RankingAlgorithm;
}

export default function Leaderboard({
    players,
    withPodium = true,
    onPlayerPress,
    showUnranked = true,
    season,
    minMatchesRequiredToBeRanked,
    ListHeaderComponent,
    ListFooterComponent,
    podiumEmptyComponent = <LeaderboardEmptyComponent />,
    rankingAlgorithm = 'AVERAGE',
    style,
    ...rest
}: LeaderboardProps) {
    const newDesign = useNewDesign();

    const { rankedPlayers, rows } = useMemo(() => {
        // copy: `players` can be cached query data, which must not be sorted in place
        const sortedPlayers = [...players].sort(
            getRankingAlgorithm(rankingAlgorithm).sortFunc
        );
        const ranked = sortedPlayers.filter(
            (i) => i.matches >= minMatchesRequiredToBeRanked
        );
        const out: LeaderboardRow[] = (
            withPodium ? ranked.slice(3) : ranked
        ).map((player, idx) => ({
            type: 'player',
            player,
            placement: idx + (withPodium ? 4 : 1),
            unranked: false,
        }));
        const unranked = sortedPlayers.filter(
            (i) => i.matches < minMatchesRequiredToBeRanked
        );
        if (showUnranked && unranked.length) {
            out.push({ type: 'unrankedHeader' });
            sortedPlayers.forEach((player, idx) => {
                if (player.matches < minMatchesRequiredToBeRanked) {
                    out.push({
                        type: 'player',
                        player,
                        placement: idx + 1,
                        unranked: true,
                    });
                }
            });
        }
        return { rankedPlayers: ranked, rows: out };
    }, [
        players,
        rankingAlgorithm,
        minMatchesRequiredToBeRanked,
        withPodium,
        showUnranked,
    ]);

    return (
        <>
            <LegendList
                {...rest}
                style={[{ flex: 1 }, style]}
                data={rows}
                keyExtractor={(item) =>
                    item.type === 'player' ? item.player.id : item.type
                }
                getItemType={(item) => item.type}
                estimatedItemSize={newDesign ? 72 : 60.5}
                recycleItems
                ListHeaderComponent={
                    <View style={{ alignItems: 'center', paddingBottom: 14 }}>
                        {ListHeaderComponent}
                        {season && <LeaderBoardSeasonInfo {...season} />}
                        {withPodium &&
                            (rankedPlayers[0] ? (
                                newDesign ? (
                                    <NextPodium
                                        firstPlace={rankedPlayers[0]}
                                        secondPlace={rankedPlayers[1]}
                                        thirdPlace={rankedPlayers[2]}
                                        onPlayerPress={onPlayerPress}
                                        rankingAlgorithm={rankingAlgorithm}
                                    />
                                ) : (
                                    <Podium
                                        firstPlace={rankedPlayers[0]}
                                        secondPlace={rankedPlayers[1]}
                                        thirdPlace={rankedPlayers[2]}
                                        onPlayerPress={onPlayerPress}
                                        rankingAlgorithm={rankingAlgorithm}
                                    />
                                )
                            ) : (
                                podiumEmptyComponent
                            ))}
                    </View>
                }
                ListEmptyComponent={
                    players.length < 1 ? (
                        <Pressable onPress={() => router.navigate('/newMatch')}>
                            <Text
                                color="secondary"
                                style={{
                                    textAlign: 'center',
                                    paddingTop: 64,
                                    lineHeight: 32,
                                }}
                            >
                                No matches played yet. {'\n'}
                                <Text
                                    color="primary"
                                    style={{
                                        fontWeight: 500,
                                    }}
                                >
                                    Create match
                                </Text>
                            </Text>
                        </Pressable>
                    ) : null
                }
                ListFooterComponent={ListFooterComponent}
                // re-render rows when the design is switched
                extraData={newDesign}
                renderItem={({ item }) =>
                    item.type === 'player' && newDesign ? (
                        <NextLeaderboardRow
                            player={item.player}
                            placement={item.placement}
                            unranked={item.unranked}
                            rankingAlgorithm={rankingAlgorithm}
                            onPlayerPress={onPlayerPress}
                        />
                    ) : item.type === 'player' ? (
                        <LeaderboardPlayerItem
                            name={item.player.name}
                            cups={item.player.cups}
                            id={item.player.id}
                            placement={item.placement}
                            points={item.player.points}
                            matches={item.player.matches}
                            elo={item.player.elo}
                            matchesWon={item.player.matchesWon}
                            avatarUrl={item.player.avatarUrl}
                            unranked={item.unranked}
                            onPlayerPress={onPlayerPress}
                            rankingAlgorithm={rankingAlgorithm}
                        />
                    ) : (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                height: 64,
                                paddingHorizontal: newDesign ? 20 : 8,
                                paddingVertical: 12,
                            }}
                        >
                            <Text
                                color="primary"
                                style={{
                                    fontSize: 17,
                                }}
                            >
                                Unranked
                            </Text>
                            <Text
                                color="secondary"
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                {`${plural(minMatchesRequiredToBeRanked, 'match', 'matches')} required to qualify`}
                            </Text>
                        </View>
                    )
                }
            />
        </>
    );
}
