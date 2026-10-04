import { Stack } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';

import { useGroup } from '@/api/calls/seasonHooks';
import { MinimalMatch } from '@/api/utils/matchDtoToMatch';
import MatchVsHeader from '@/components/MatchVsHeader';
import { useSwiperPage } from '@/hooks/useSwiperPage';
import { useNavStyles } from '@/lib/navigation/navStyles';

export const NewMatchStack: React.FC<{
    onCreateRandomTeams: () => void;
    randomTeamsMode: { players: string[] } | null;
    onExitRandomTeamsMode: () => void;

    animationProgress: SharedValue<number>;

    match: Omit<MinimalMatch, 'id' | 'date'>;

    isCreating: boolean;

    onBack: () => void;
    onNext: () => void;
    onCreate: () => void;
    /** pro mode: the teams page starts a live match instead of going on to the next page */
    onStart?: () => void;
    canStart?: boolean;
}> = ({
    onCreateRandomTeams,
    randomTeamsMode,
    onExitRandomTeamsMode,
    animationProgress,
    match,

    isCreating,

    onBack,
    onNext,
    onCreate,
    onStart,
    canStart = false,
}) => {
    const { activeSeason } = useGroup();

    const minTeamSize = activeSeason?.seasonSettings?.minTeamSize ?? 1;
    const maxTeamSize = activeSeason?.seasonSettings?.maxTeamSize ?? 10;

    const bothTeamsEmpty =
        match.blueTeam.length === 0 && match.redTeam.length === 0;

    const hasValidTeams = match.redTeam.length && match.blueTeam.length;

    const isRandomTeamsMode = randomTeamsMode !== null;

    const page = useSwiperPage(animationProgress);

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: isRandomTeamsMode
                        ? 'Random Teams'
                        : bothTeamsEmpty
                          ? 'Assign Teams'
                          : () => (
                                <MatchVsHeader match={match} variant="header" />
                            ),
                }}
            />
            {/* On the first page the tab's Groups button keeps the left side; one button on
                the right leaves room for the teams in the title. Later pages replace Groups
                with Back. */}
            {page === 0 ? (
                <Stack.Toolbar placement="right">
                    {isRandomTeamsMode && (
                        <Stack.Toolbar.Button onPress={onExitRandomTeamsMode}>
                            Cancel
                        </Stack.Toolbar.Button>
                    )}
                    {isRandomTeamsMode ? (
                        <Stack.Toolbar.Button
                            onPress={onCreateRandomTeams}
                            disabled={
                                randomTeamsMode.players.length <
                                    minTeamSize * 2 ||
                                randomTeamsMode.players.length > maxTeamSize * 2
                            }
                        >
                            Generate
                        </Stack.Toolbar.Button>
                    ) : onStart ? (
                        <Stack.Toolbar.Button
                            variant="done"
                            onPress={onStart}
                            disabled={!canStart}
                        >
                            Start match
                        </Stack.Toolbar.Button>
                    ) : (
                        <Stack.Toolbar.Button
                            onPress={onNext}
                            disabled={!hasValidTeams}
                        >
                            Next
                        </Stack.Toolbar.Button>
                    )}
                </Stack.Toolbar>
            ) : (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button onPress={onBack}>
                            Back
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                    <Stack.Toolbar placement="right">
                        <Stack.Toolbar.Button
                            variant="done"
                            disabled={isCreating}
                            onPress={onCreate}
                        >
                            Create
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                </>
            )}
        </>
    );
};
