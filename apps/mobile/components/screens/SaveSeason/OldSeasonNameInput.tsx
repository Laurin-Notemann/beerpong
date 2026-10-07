import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import type { TextInputInstance } from 'react-native';

import { Player } from '@/api/calls/seasonHooks';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';
import { rankPlayers } from '@/constants/rankingAlgorithms';
import { useInsets } from '@/lib/useInsets';

export const OldSeasonNameInput: React.FC<{
    oldSeasonNameInputRef: React.RefObject<TextInputInstance | null>;
    numMatches: number;
    numPlayers: number;
    startDate: string;
    rankedPlayers: Player[];
    rankingAlgorithm: 'AVERAGE' | 'ELO';

    onChangeName: (name: string) => void;
}> = ({
    numMatches,
    numPlayers,
    startDate,
    rankedPlayers,
    onChangeName,
    oldSeasonNameInputRef,
    rankingAlgorithm,
}) => {
    const insets = useInsets(true);
    const [endDate] = useState(() => new Date().toString());

    return (
        <KeyboardAvoidingView
            style={{
                flex: 1,
                justifyContent: 'flex-end',

                paddingHorizontal: 16,
                paddingTop: insets.top + 20,
            }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.select({
                ios: 60 + 36,
                android: 0 + 36,
            })}
        >
            <LeaderBoardSeasonInfo
                isCurrentSeason
                numMatches={numMatches}
                numPlayers={numPlayers}
                startDate={startDate}
                endDate={endDate}
            />
            <Podium
                detailed={false}
                style={{ marginHorizontal: 'auto' }}
                places={rankPlayers(rankedPlayers, rankingAlgorithm).slice(
                    0,
                    3
                )}
                rankingAlgorithm={rankingAlgorithm}
            />
            <View style={{ height: 16 }} />
            <TextInput
                ref={oldSeasonNameInputRef}
                required
                placeholder="Season Name"
                onChangeText={onChangeName}
                autoFocus
                style={{
                    alignSelf: 'stretch',
                }}
            />
            <View style={{ height: 16 }} />
        </KeyboardAvoidingView>
    );
};
