import { forwardRef, useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import {
    SharedValue,
    useAnimatedReaction,
    useSharedValue,
} from 'react-native-reanimated';
import Carousel, {
    ICarouselInstance,
    TCarouselProps,
} from 'react-native-reanimated-carousel';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme';

export interface SwiperProps
    extends Omit<
        TCarouselProps,
        'data' | 'renderItem' | 'mode' | 'vertical' | 'modeConfig'
    > {
    children: React.ReactNode | React.ReactNode[];

    enabled?: boolean;

    onPageChange?: (idx: number) => void;

    swiperProgress: SharedValue<number>;

    withPeek?: boolean;
}

/**
 * built on top of react-native-reanimated-carousel.
 * - exposes the swipe progress
 * - peek
 */
export const Swiper = forwardRef<ICarouselInstance, SwiperProps>(
    (
        {
            children,
            enabled,
            onPageChange,
            swiperProgress,
            withPeek = false,
            ...rest
        },
        ref
    ) => {
        const pages = Array.isArray(children) ? children : [children];

        const cleanPages = pages.filter((i) => !!i) as JSX.Element[];

        const containerRef = useRef<View>(null);

        const [containerWidth, setContainerWidth] = useState(
            Dimensions.get('window').width
        );

        const theme = useTheme();

        const computedWidth = withPeek
            ? containerWidth -
              theme.carousel.peekGap -
              theme.carousel.peekSize * 2
            : containerWidth;

        return (
            <View
                ref={containerRef}
                onLayout={() => {
                    containerRef.current?.measure((x, y, w) => {
                        setContainerWidth(w);
                    });
                }}
                style={{ flex: 1 }}
            >
                <Carousel
                    {...rest}
                    ref={ref}
                    onProgressChange={(relativeOffset) => {
                        swiperProgress.value = -relativeOffset / computedWidth;
                    }}
                    onSnapToItem={onPageChange}
                    loop={false}
                    width={computedWidth}
                    style={{ width: containerWidth }}
                    enabled={enabled}
                    data={cleanPages}
                    renderItem={(item) => item.item}
                />
            </View>
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

    const ref = useRef<ICarouselInstance>(null);

    return {
        swiperProgress,
        ref,
        defaultIndex: initialPage,
    };
}

export function useControlledSwiper(
    progress: SharedValue<number>,
    debugName: string
) {
    const ref = useRef<ICarouselInstance>(null);

    const switchToPage = (value: number) => {
        ref.current?.scrollTo({ index: value, animated: false });
    };

    useEffect(() => {
        switchToPage(Math.round(progress.value));
    }, []);

    useAnimatedReaction(
        () => progress.value,
        (v) => {
            'worklet';
            if (Math.round(v) === v) {
                scheduleOnRN(switchToPage, v);
            }
        }
    );

    return {
        defaultIndex: Math.round(progress.value),
        swiperProgress: progress,
        ref,
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

    const ref = useRef<ICarouselInstance>(null);

    return {
        swiperPage,
        swiperProgress,
        ref,
        onPageChange: setSwiperPage,
        defaultIndex: initialPage,
    };
}
