import React, { useState } from 'react';
import { Pressable, View, ViewProps } from 'react-native';

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
import { ThemedView } from '@/components/ThemedView';
import {
    getRankingAlgorithm,
    type RankingAlgorithm,
} from '@/constants/rankingAlgorithms';

const MODAL_ON_LONG_PRESS = false;

const NEW_UNRANKED_ITEM = false;

export interface LeaderboardProps extends ViewProps {
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
    ListEmptyComponent?: React.ReactNode;
    rankingAlgorithm?: RankingAlgorithm;
}

export default function Leaderboard({
    players,
    withPodium = true,
    onPlayerPress,
    showUnranked = true,
    season,
    minMatchesRequiredToBeRanked,
    ListEmptyComponent = <LeaderboardEmptyComponent />,
    rankingAlgorithm = 'AVERAGE',
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

    return (
        <View
            {...rest}
            style={[rest.style, { width: '100%', alignItems: 'center' }]}
        >
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
            {season && <LeaderBoardSeasonInfo {...season} />}
            {withPodium &&
                (rankedPlayers[0] ? (
                    <Podium
                        firstPlace={rankedPlayers[0]}
                        secondPlace={rankedPlayers[1]}
                        thirdPlace={rankedPlayers[2]}
                        onPlayerPress={onPlayerPress}
                        onPlayerLongPress={
                            MODAL_ON_LONG_PRESS
                                ? (id) => setPlayerPreviewModalId(id)
                                : undefined
                        }
                        rankingAlgorithm={rankingAlgorithm}
                    />
                ) : (
                    ListEmptyComponent
                ))}
            <ThemedView
                style={{
                    alignSelf: 'stretch',
                    paddingTop: 14,
                }}
            >
                {nonPodiumPlayers.map((i, idx) => (
                    <LeaderboardPlayerItem
                        key={idx}
                        name={i.name}
                        cups={i.cups}
                        id={i.id}
                        placement={idx + (withPodium ? 4 : 1)}
                        points={i.points}
                        matches={i.matches}
                        elo={i.elo}
                        matchesWon={i.matchesWon}
                        avatarUrl={i.avatarUrl}
                        onPlayerPress={onPlayerPress}
                        onPlayerLongPress={
                            MODAL_ON_LONG_PRESS
                                ? (id) => setPlayerPreviewModalId(id)
                                : undefined
                        }
                        rankingAlgorithm={rankingAlgorithm}
                    />
                ))}
                {showUnranked && unrankedPlayers.length ? (
                    NEW_UNRANKED_ITEM ? (
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
                ) : null}
                {showUnranked &&
                    unrankedPlayers.map((i, idx) => (
                        <LeaderboardPlayerItem
                            key={idx}
                            cups={i.cups}
                            name={i.name}
                            id={i.id}
                            placement={
                                sortedPlayers.findIndex((j) => j.id === i.id) +
                                1
                            }
                            points={i.points}
                            matches={i.matches}
                            elo={i.elo}
                            matchesWon={i.matchesWon}
                            avatarUrl={i.avatarUrl}
                            unranked
                            onPlayerPress={onPlayerPress}
                            onPlayerLongPress={
                                MODAL_ON_LONG_PRESS
                                    ? (id) => setPlayerPreviewModalId(id)
                                    : undefined
                            }
                            rankingAlgorithm={rankingAlgorithm}
                        />
                    ))}
                {players.length < 1 && (
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
                )}
            </ThemedView>
        </View>
    );
}
