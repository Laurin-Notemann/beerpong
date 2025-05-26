import {
    KeyboardAvoidingView,
    Platform,
    TextInput as RNTextInput,
    View,
} from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import { useInsets } from '@/app/useInsets';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';

export const OldSeasonNameInput: React.FC<{
    oldSeasonNameInputRef: React.RefObject<RNTextInput>;
    numMatches: number;
    numPlayers: number;
    startDate: string;
    rankedPlayers: Player[];

    onChangeName: (name: string) => void;
}> = ({
    numMatches,
    numPlayers,
    startDate,
    rankedPlayers,
    onChangeName,
    oldSeasonNameInputRef,
}) => {
    const insets = useInsets(true);

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
                endDate={new Date().toString()}
            />
            <Podium
                detailed={false}
                style={{ marginHorizontal: 'auto' }}
                firstPlace={rankedPlayers[0]}
                secondPlace={rankedPlayers[1]}
                thirdPlace={rankedPlayers[2]}
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
