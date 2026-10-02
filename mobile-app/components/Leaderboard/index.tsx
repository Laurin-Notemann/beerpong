import { LegendList, LegendListProps } from '@legendapp/list/react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import LeaderboardPlayerItem from '@/components/Leaderboard/LeaderboardPlayerItem';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import { LongPressModal } from '@/components/LongPressModal';
import MenuItem from '@/components/Menu/MenuItem';
import { PlayerPageHeadSection } from '@/components/PlayerPageHeadSection';
import Podium from '@/components/Podium';
import Text from '@/components/Text';
import {
    getRankingAlgorithm,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';

const MODAL_ON_LONG_PRESS = false;

const NEW_UNRANKED_ITEM = false;

type LeaderboardRow =
    | { type: 'player'; player: Player; placement: number; unranked: boolean }
    | { type: 'unrankedHeader' };

export interface LeaderboardProps
    extends Pick<
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
    const [playerPreviewModalId, setPlayerPreviewModalId] = useState<
        string | null
    >(null);

    const previewedPlayer = players.find((i) => i.id === playerPreviewModalId);

    const nav = useNavigation();

    const sortedPlayers = players.sort(
        getRankingAlgorithm(rankingAlgorithm).sortFunc
    );

    const rankedPlayers = sortedPlayers.filter(
        (i) => i.matches >= minMatchesRequiredToBeRanked
    );
    const nonPodiumPlayers = withPodium
        ? rankedPlayers.slice(3)
        : rankedPlayers;

    const unrankedPlayers = sortedPlayers.filter(
        (i) => i.matches < minMatchesRequiredToBeRanked
    );

    const rows: LeaderboardRow[] = nonPodiumPlayers.map((player, idx) => ({
        type: 'player',
        player,
        placement: idx + (withPodium ? 4 : 1),
        unranked: false,
    }));
    if (showUnranked && unrankedPlayers.length) {
        rows.push({ type: 'unrankedHeader' });
        for (const player of unrankedPlayers) {
            rows.push({
                type: 'player',
                player,
                placement:
                    sortedPlayers.findIndex((j) => j.id === player.id) + 1,
                unranked: true,
            });
        }
    }

    const onPlayerLongPress = MODAL_ON_LONG_PRESS
        ? (id: string) => setPlayerPreviewModalId(id)
        : undefined;

    return (
        <>
            {MODAL_ON_LONG_PRESS && (
                <LongPressModal
                    isVisible={playerPreviewModalId}
                    onClose={() => setPlayerPreviewModalId(null)}
                    onPress={() => {
                        nav.navigate('player', {
                            id: playerPreviewModalId!,
                        });
                        setPlayerPreviewModalId(null);
                    }}
                    content={
                        <PlayerPageHeadSection
                            avatarUrl={previewedPlayer?.avatarUrl}
                            placement={0} // TODO
                            name={previewedPlayer?.name || 'Unknown'}
                            elo={previewedPlayer?.elo || 0}
                            matchesWon={previewedPlayer?.matchesWon || 0}
                            points={previewedPlayer?.points || 0}
                            cups={0} // TODO
                            isUnranked={
                                (previewedPlayer?.matches ?? 0) <
                                minMatchesRequiredToBeRanked
                            }
                            editable={false}
                            onUploadAvatarPress={() => {}}
                            matches={[]}
                            rankingAlgorithm={rankingAlgorithm}
                        />
                    }
                />
            )}
            <LegendList
                {...rest}
                style={[{ flex: 1 }, style]}
                data={rows}
                keyExtractor={(item) =>
                    item.type === 'player' ? item.player.id : item.type
                }
                getItemType={(item) => item.type}
                estimatedItemSize={60.5}
                recycleItems
                ListHeaderComponent={
                    <View style={{ alignItems: 'center', paddingBottom: 14 }}>
                        {ListHeaderComponent}
                        {season && <LeaderBoardSeasonInfo {...season} />}
                        {withPodium &&
                            (rankedPlayers[0] ? (
                                <Podium
                                    firstPlace={rankedPlayers[0]}
                                    secondPlace={rankedPlayers[1]}
                                    thirdPlace={rankedPlayers[2]}
                                    onPlayerPress={onPlayerPress}
                                    onPlayerLongPress={onPlayerLongPress}
                                    rankingAlgorithm={rankingAlgorithm}
                                />
                            ) : (
                                podiumEmptyComponent
                            ))}
                    </View>
                }
                ListEmptyComponent={
                    players.length < 1 ? (
                        <Pressable onPress={() => nav.navigate('newMatch')}>
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
                renderItem={({ item }) =>
                    item.type === 'player' ? (
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
                            onPlayerLongPress={onPlayerLongPress}
                            rankingAlgorithm={rankingAlgorithm}
                        />
                    ) : NEW_UNRANKED_ITEM ? (
                        <MenuItem
                            title="Unranked"
                            subtitle={
                                minMatchesRequiredToBeRanked > 1
                                    ? `${minMatchesRequiredToBeRanked} matches required to qualify`
                                    : `1 match required to qualify`
                            }
                            border={false}
                            onPress={() =>
                                nav.navigate('minMatchesToQualifySettings')
                            }
                        />
                    ) : (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                height: 64,
                                paddingHorizontal: 8,
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
                                {minMatchesRequiredToBeRanked > 1
                                    ? `${minMatchesRequiredToBeRanked} matches required to qualify`
                                    : `${minMatchesRequiredToBeRanked} match required to qualify`}
                            </Text>
                        </View>
                    )
                }
            />
        </>
    );
}
