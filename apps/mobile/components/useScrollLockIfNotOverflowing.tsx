import { useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

/**
 * if the contents of the scroll view are larger than the container, enable scrolling
 * otherwise, disable scrolling so we don't intercept other touch gestures like closing modals.
 */
export function useScrollLockIfNotOverflowing() {
    const [containerHeight, setContainerHeight] = useState(0);
    const [scrollEnabled, setScrollEnabled] = useState(false);

    const onContentSizeChange = (
        contentWidth: number,
        contentHeight: number
    ) => {
        setScrollEnabled(contentHeight > containerHeight);
    };

    return {
        onLayout: (e: LayoutChangeEvent) =>
            setContainerHeight(e.nativeEvent.layout.height),
        onContentSizeChange: onContentSizeChange,
        scrollEnabled: scrollEnabled,
    };
}
