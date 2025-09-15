import { Stack } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useGroup } from '@/api/calls/seasonHooks';
import { Match } from '@/api/utils/matchDtoToMatch';
import { useNavStyles } from '@/app/navigation/navStyles';
import { HeaderItem } from '@/components/HeaderItem';
import MatchVsHeader from '@/components/MatchVsHeader';
import { SwipeButtons } from '@/components/SwipeButtons';

export const NewMatchStack: React.FC<{
    onCreateRandomTeams: () => void;
    randomTeamsMode: { players: string[] } | null;
    onExitRandomTeamsMode: () => void;

    animationProgress: Animated.SharedValue<number>;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    isCreating: boolean;

    onClear: () => void;
    onBack: () => void;
    onNext: () => void;
    onCreate: () => void;
}> = ({
    onCreateRandomTeams,
    randomTeamsMode,
    onExitRandomTeamsMode,
    animationProgress,
    match,

    isCreating,

    onClear,
    onBack,
    onNext,
    onCreate,
}) => {
    const { group } = useGroup();

    const minTeamSize =
        group.data?.activeSeason?.seasonSettings?.minTeamSize ?? 1;
    const maxTeamSize =
        group.data?.activeSeason?.seasonSettings?.maxTeamSize ?? 10;

    const bothTeamsEmpty =
        match.blueTeam.length === 0 && match.redTeam.length === 0;

    const hasValidTeams = match.redTeam.length && match.blueTeam.length;

    const isRandomTeamsMode = randomTeamsMode !== null;

    return (
        <Stack.Screen
            options={{
                ...useNavStyles(),
                headerLeft: () => (
                    <SwipeButtons
                        animationProgress={animationProgress}
                        slot1={
                            isRandomTeamsMode ? (
                                <HeaderItem onPress={onExitRandomTeamsMode}>
                                    Cancel
                                </HeaderItem>
                            ) : (
                                !bothTeamsEmpty && (
                                    <HeaderItem onPress={onClear}>
                                        Clear
                                    </HeaderItem>
                                )
                            )
                        }
                        slot2={<HeaderItem onPress={onBack}>Back</HeaderItem>}
                    />
                ),
                headerRight: () => (
                    <SwipeButtons
                        animationProgress={animationProgress}
                        slot1={
                            isRandomTeamsMode ? (
                                <HeaderItem
                                    onPress={onCreateRandomTeams}
                                    disabled={
                                        randomTeamsMode.players.length <
                                            minTeamSize * 2 ||
                                        randomTeamsMode.players.length >
                                            maxTeamSize * 2
                                    }
                                >
                                    Generate
                                </HeaderItem>
                            ) : (
                                <HeaderItem
                                    onPress={onNext}
                                    disabled={!hasValidTeams}
                                >
                                    Next
                                </HeaderItem>
                            )
                        }
                        slot2={
                            <HeaderItem
                                onPress={onCreate}
                                isLoading={isCreating}
                            >
                                Create
                            </HeaderItem>
                        }
                    />
                ),
                headerTitle: isRandomTeamsMode
                    ? 'Random Teams'
                    : bothTeamsEmpty
                      ? 'Assign Teams'
                      : () => (
                            <MatchVsHeader
                                match={match}
                                style={{
                                    bottom: 4,
                                }}
                            />
                        ),
            }}
        />
    );
};
