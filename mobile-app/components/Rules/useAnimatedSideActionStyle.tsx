import { useEffect } from 'react';
import {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

export function useAnimatedSideActionStyle(
    isExpanded: boolean,
    expandedWidth = 40
) {
    // width of the square around the delete button that slides out when the sidebar is in edit mode
    const deleteActionWidth = useSharedValue(isExpanded ? expandedWidth : 0);
    const margin = useSharedValue(isExpanded ? 12 : 0);

    useEffect(() => {
        deleteActionWidth.value = withTiming(isExpanded ? expandedWidth : 0, {
            duration: 150,
        });
        margin.value = withTiming(isExpanded ? 12 : 0, {
            duration: 150,
        });
    }, [isExpanded]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: deleteActionWidth.value,
        marginLeft: margin.value * -1,
    }));
    return animatedStyle;
}
