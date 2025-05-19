import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { Match } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import { HeaderItem } from '@/components/HeaderItem';
import MatchVsHeader from '@/components/MatchVsHeader';
import { SwipeButtons } from '@/components/SwipeButtons';

export const NewMatchStack: React.FC<{
    animationProgress: Animated.SharedValue<number>;

    match: Omit<Match, 'id' | 'date' | 'winnerTeamId'>;

    isCreating: boolean;

    onClear: () => void;
    onBack: () => void;
    onNext: () => void;
    onCreate: () => void;
}> = ({
    animationProgress,
    match,

    isCreating,

    onClear,
    onBack,
    onNext,
    onCreate,
}) => {
    const bothTeamsEmpty =
        match.blueTeam.length === 0 && match.redTeam.length === 0;

    const hasValidTeams = match.redTeam.length && match.blueTeam.length;

    return (
        <Stack.Screen
            options={{
                ...navStyles,
                headerLeft: () => (
                    <SwipeButtons
                        animationProgress={animationProgress}
                        slot1={
                            !bothTeamsEmpty && (
                                <HeaderItem onPress={onClear}>Clear</HeaderItem>
                            )
                        }
                        slot2={<HeaderItem onPress={onBack}>Back</HeaderItem>}
                    />
                ),
                headerRight: () => (
                    <SwipeButtons
                        animationProgress={animationProgress}
                        slot1={
                            <HeaderItem
                                onPress={onNext}
                                disabled={!hasValidTeams}
                            >
                                Next
                            </HeaderItem>
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
                headerTitle: bothTeamsEmpty
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
