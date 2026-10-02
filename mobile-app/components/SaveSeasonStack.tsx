import { Stack } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';

import { useNavStyles } from '@/app/navigation/navStyles';
import { useSwiperPage } from '@/hooks/useSwiperPage';

export const SaveSeasonStack: React.FC<{
    oldSeasonIsEmpty: boolean;
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
    oldSeasonIsEmpty,
}) => {
    const page = useSwiperPage(animationProgress);

    // with an empty old season there is no "Save Old Season" page, only the new season's rules
    const isOldSeasonPage = !oldSeasonIsEmpty && page === 0;

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: isOldSeasonPage
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
                        Save
                    </Stack.Toolbar.Button>
                )}
            </Stack.Toolbar>
        </>
    );
};
