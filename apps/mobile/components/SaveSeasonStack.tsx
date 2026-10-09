import { Stack } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';

import { useSwiperPage } from '@/hooks/useSwiperPage';
import { useNavStyles } from '@/lib/navigation/navStyles';

export const SaveSeasonStack: React.FC<{
    hasNamePage: boolean;
    /** only names and ends the current season, without starting the next */
    endOnly: boolean;
    isNextDisabled: boolean;
    isCreateDisabled: boolean;

    animationProgress: SharedValue<number>;

    isCreating: boolean;

    onClear: () => void;
    onBack: () => void;
    onNext: () => void;
    onCreate: () => void;
}> = ({
    animationProgress,

    isCreating,

    onClear,
    onBack,
    onNext,
    onCreate,

    isNextDisabled,
    isCreateDisabled,
    hasNamePage,
    endOnly,
}) => {
    const page = useSwiperPage(animationProgress);

    // an empty or already ended old season has no "Save Old Season" page, only the new season's rules
    const isOldSeasonPage = hasNamePage && page === 0 && !endOnly;

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: endOnly
                        ? 'End Season'
                        : isOldSeasonPage
                          ? 'Save Old Season'
                          : 'Start New Season',
                }}
            />
            <Stack.Toolbar placement="left">
                {page === 0 ? (
                    <Stack.Toolbar.Button onPress={onClear}>
                        Cancel
                    </Stack.Toolbar.Button>
                ) : (
                    <Stack.Toolbar.Button onPress={onBack}>
                        Back
                    </Stack.Toolbar.Button>
                )}
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                {isOldSeasonPage ? (
                    <Stack.Toolbar.Button
                        disabled={isNextDisabled}
                        onPress={onNext}
                    >
                        Next
                    </Stack.Toolbar.Button>
                ) : (
                    <Stack.Toolbar.Button
                        variant="done"
                        disabled={isCreateDisabled || isCreating}
                        onPress={onCreate}
                    >
                        {endOnly ? 'End' : 'Save'}
                    </Stack.Toolbar.Button>
                )}
            </Stack.Toolbar>
        </>
    );
};
