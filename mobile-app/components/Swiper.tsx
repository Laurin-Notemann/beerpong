import type React from 'react';
import {
    forwardRef,
    RefObject,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import PagerView, {
    PagerViewOnPageScrollEvent,
    PagerViewOnPageSelectedEvent,
    PageScrollStateChangedNativeEvent,
} from 'react-native-pager-view';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export interface SwiperRef {
    scrollTo: (options: { index: number; animated?: boolean }) => void;
    next: (options?: { animated?: boolean }) => void;
    prev: (options?: { animated?: boolean }) => void;
    getCurrentIndex: () => number;
}

export interface SwiperProps {
    children: React.ReactNode | React.ReactNode[];

    enabled?: boolean;

    defaultIndex?: number;

    onPageChange?: (idx: number) => void;

    /** the user started dragging */
    onScrollStart?: () => void;

    swiperProgress: SharedValue<number>;

    style?: StyleProp<ViewStyle>;
}

/**
 * Native horizontal pager (UIPageViewController / ViewPager2).
 * Exposes the swipe progress as a shared value, e.g. 1.5 halfway between page 2 and 3.
 */
export const Swiper = forwardRef<SwiperRef, SwiperProps>(
    (
        {
            children,
            enabled = true,
            defaultIndex = 0,
            onPageChange,
            onScrollStart,
            swiperProgress,
            style,
        },
        ref
    ) => {
        const pages = (Array.isArray(children) ? children : [children]).filter(
            Boolean
        );

        const pager = useRef<PagerView>(null);
        const currentIndex = useRef(defaultIndex);

        const goTo = (index: number, animated = true) => {
            const clamped = Math.max(0, Math.min(index, pages.length - 1));
            if (animated) pager.current?.setPage(clamped);
            else pager.current?.setPageWithoutAnimation(clamped);
        };

        useImperativeHandle(ref, () => ({
            scrollTo: ({ index, animated = true }) => goTo(index, animated),
            next: (options) =>
                goTo(currentIndex.current + 1, options?.animated ?? true),
            prev: (options) =>
                goTo(currentIndex.current - 1, options?.animated ?? true),
            getCurrentIndex: () => currentIndex.current,
        }));

        return (
            <PagerView
                ref={pager}
                style={[{ flex: 1 }, style]}
                initialPage={defaultIndex}
                scrollEnabled={enabled}
                onPageScroll={(e: PagerViewOnPageScrollEvent) => {
                    swiperProgress.value =
                        e.nativeEvent.position + e.nativeEvent.offset;
                }}
                onPageScrollStateChanged={(
                    e: PageScrollStateChangedNativeEvent
                ) => {
                    if (e.nativeEvent.pageScrollState === 'dragging')
                        onScrollStart?.();
                }}
                onPageSelected={(e: PagerViewOnPageSelectedEvent) => {
                    currentIndex.current = e.nativeEvent.position;
                    onPageChange?.(e.nativeEvent.position);
                }}
            >
                {pages.map((page, idx) => (
                    // PagerView needs one plain native view per page
                    <View key={idx} collapsable={false} style={{ flex: 1 }}>
                        {page}
                    </View>
                ))}
            </PagerView>
        );
    }
);

Swiper.displayName = 'Swiper';

/**
 * @returns swiperProgress - float representing the interpolated page idx (e.g. 1.5 if the user if halfway between page 2 and 3)
 *
 * if you need to rerender when the page has changed, use `useSwiperWithPageState` instead.
 */
export function useSwiper(options?: { initialPage?: number | null }) {
    const initialPage = options?.initialPage ?? 0;

    const swiperProgress = useSharedValue(initialPage);

    const ref = useRef<SwiperRef>(null);

    return {
        swiperProgress,
        ref,
        defaultIndex: initialPage,
    };
}

// Swipers that show the same scope (leaderboard, matches, player) share one progress value.
const controlledSwipers = new Map<
    SharedValue<number>,
    Set<RefObject<SwiperRef | null>>
>();

/** Moves every mounted swiper driven by `progress` to `index` (e.g. a scope tab was tapped). */
export function scrollControlledSwipers(
    progress: SharedValue<number>,
    index: number
) {
    controlledSwipers
        .get(progress)
        ?.forEach((ref) => ref.current?.scrollTo({ index, animated: true }));
}

export function useControlledSwiper(progress: SharedValue<number>) {
    const ref = useRef<SwiperRef>(null);

    useEffect(() => {
        const group = controlledSwipers.get(progress) ?? new Set();
        group.add(ref);
        controlledSwipers.set(progress, group);
        return () => {
            group.delete(ref);
        };
    }, [progress]);

    return {
        defaultIndex: Math.round(progress.value),
        swiperProgress: progress,
        ref,
        // keep the other swipers of this scope on the same page
        onPageChange: (idx: number) => {
            controlledSwipers.get(progress)?.forEach((other) => {
                if (other !== ref && other.current?.getCurrentIndex() !== idx)
                    other.current?.scrollTo({ index: idx, animated: false });
            });
        },
    };
}

/**
 * @returns swiperProgress - float representing the interpolated page idx (e.g. 1.5 if the user if halfway between page 2 and 3)
 *
 * if you don't need to rerender when the page has changed, use `useSwiper` instead.
 * for example, if you're swiping multiple scroll views, their scroll progress might glitch back to the top after swiping.
 */
export function useSwiperWithPageState(options?: {
    initialPage?: number | null;
}) {
    const initialPage = options?.initialPage ?? 0;

    const swiperProgress = useSharedValue(initialPage);

    const [swiperPage, setSwiperPage] = useState(initialPage);

    const ref = useRef<SwiperRef>(null);

    return {
        swiperPage,
        swiperProgress,
        ref,
        onPageChange: setSwiperPage,
        defaultIndex: initialPage,
    };
}
