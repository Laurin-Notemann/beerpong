import { useIsFocused } from 'expo-router/react-navigation';
import type React from 'react';
import {
    forwardRef,
    RefObject,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { NativeSyntheticEvent, StyleProp, View, ViewStyle } from 'react-native';
import PagerView from 'react-native-pager-view';
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

    /**
     * Only mount pages within this distance of the current page; pages stay mounted once
     * visited. Keeps opening a screen with many heavy pages (one list per season) cheap.
     */
    lazyWindow?: number;
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
            lazyWindow,
        },
        ref
    ) => {
        const pages = (Array.isArray(children) ? children : [children]).filter(
            Boolean
        );

        const pager = useRef<PagerView>(null);
        const currentIndex = useRef(defaultIndex);

        const [visited, setVisited] = useState(() => new Set([defaultIndex]));
        const isMounted = (idx: number) =>
            lazyWindow == null ||
            visited.has(idx) ||
            [...visited].some((v) => Math.abs(v - idx) <= lazyWindow);

        const goTo = (index: number, animated = true) => {
            const clamped = Math.max(0, Math.min(index, pages.length - 1));
            // mount the target first, so it isn't blank while the pager animates there
            if (lazyWindow != null && !visited.has(clamped)) {
                setVisited((prev) => new Set(prev).add(clamped));
            }
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
                onPageScroll={(
                    e: NativeSyntheticEvent<{
                        position: number;
                        offset: number;
                    }>
                ) => {
                    swiperProgress.set(
                        e.nativeEvent.position + e.nativeEvent.offset
                    );
                }}
                onPageScrollStateChanged={(
                    e: NativeSyntheticEvent<{
                        pageScrollState: 'idle' | 'dragging' | 'settling';
                    }>
                ) => {
                    if (e.nativeEvent.pageScrollState === 'dragging')
                        onScrollStart?.();
                }}
                onPageSelected={(
                    e: NativeSyntheticEvent<{
                        position: number;
                    }>
                ) => {
                    const idx = e.nativeEvent.position;
                    currentIndex.current = idx;
                    if (lazyWindow != null && !visited.has(idx)) {
                        setVisited((prev) => new Set(prev).add(idx));
                    }
                    onPageChange?.(idx);
                }}
            >
                {pages.map((page, idx) => (
                    // PagerView needs one plain native view per page
                    <View key={idx} collapsable={false} style={{ flex: 1 }}>
                        {isMounted(idx) ? page : null}
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
type ControlledSwiper = {
    ref: RefObject<SwiperRef | null>;
    isFocused: RefObject<boolean>;
};
const controlledSwipers = new Map<SharedValue<number>, Set<ControlledSwiper>>();
// The last settled page per scope, kept in JS so a newly mounted swiper can start there
// without reading the shared value during render.
const lastPages = new Map<SharedValue<number>, number>();

/**
 * Moves every mounted swiper driven by `progress` to `index` (e.g. a scope tab was tapped).
 * Only the swiper on the focused screen animates; the hidden ones jump, so a single pager
 * drives the shared progress.
 */
export function scrollControlledSwipers(
    progress: SharedValue<number>,
    index: number
) {
    lastPages.set(progress, index);
    controlledSwipers
        .get(progress)
        ?.forEach(({ ref, isFocused }) =>
            ref.current?.scrollTo({ index, animated: isFocused.current })
        );
}

export function useControlledSwiper(progress: SharedValue<number>) {
    const ref = useRef<SwiperRef>(null);
    const focused = useIsFocused();
    const isFocused = useRef(focused);
    useEffect(() => {
        isFocused.current = focused;
    }, [focused]);

    useEffect(() => {
        const swiper = { ref, isFocused };
        const group = controlledSwipers.get(progress) ?? new Set();
        group.add(swiper);
        controlledSwipers.set(progress, group);
        return () => {
            group.delete(swiper);
        };
    }, [progress]);

    const [defaultIndex] = useState(() => lastPages.get(progress) ?? 0);

    return {
        defaultIndex,
        swiperProgress: progress,
        ref,
        // keep the other swipers of this scope on the same page
        onPageChange: (idx: number) => {
            lastPages.set(progress, idx);
            controlledSwipers.get(progress)?.forEach((other) => {
                if (
                    other.ref !== ref &&
                    other.ref.current?.getCurrentIndex() !== idx
                )
                    other.ref.current?.scrollTo({
                        index: idx,
                        animated: false,
                    });
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
