import { Stack } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useNavStyles } from '@/app/navigation/navStyles';
import { HeaderItem, HeaderTitle } from '@/components/HeaderItem';
import { SwipeButtons } from '@/components/SwipeButtons';

export const SaveSeasonStack: React.FC<{
    oldSeasonIsEmpty: boolean;
    isNextDisabled: boolean;
    isCreateDisabled: boolean;

    animationProgress: Animated.SharedValue<number>;

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
    return (
        <Stack.Screen
            options={{
                ...useNavStyles(),
                headerLeft: () =>
                    oldSeasonIsEmpty ? (
                        <HeaderItem onPress={onClear}>Cancel</HeaderItem>
                    ) : (
                        <SwipeButtons
                            animationProgress={animationProgress}
                            slot1={
                                <HeaderItem onPress={onClear}>
                                    Cancel
                                </HeaderItem>
                            }
                            slot2={
                                <HeaderItem onPress={onBack}>Back</HeaderItem>
                            }
                        />
                    ),
                headerRight: () =>
                    oldSeasonIsEmpty ? (
                        <HeaderItem
                            onPress={onCreate}
                            disabled={isCreateDisabled}
                            isLoading={isCreating}
                        >
                            Save
                        </HeaderItem>
                    ) : (
                        <SwipeButtons
                            animationProgress={animationProgress}
                            slot1={
                                <HeaderItem
                                    onPress={onNext}
                                    disabled={isNextDisabled}
                                >
                                    Next
                                </HeaderItem>
                            }
                            slot2={
                                <HeaderItem
                                    onPress={onCreate}
                                    disabled={isCreateDisabled}
                                    isLoading={isCreating}
                                >
                                    Save
                                </HeaderItem>
                            }
                        />
                    ),
                headerTitle: () =>
                    oldSeasonIsEmpty ? (
                        <HeaderTitle title="Start New Season" />
                    ) : (
                        <SwipeButtons
                            animationProgress={animationProgress}
                            slot1={<HeaderTitle title="Save Old Season" />}
                            slot2={<HeaderTitle title="Start New Season" />}
                        />
                    ),
            }}
        />
    );
};
