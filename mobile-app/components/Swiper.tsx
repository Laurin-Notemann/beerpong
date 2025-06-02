import { forwardRef, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import Carousel, {
    ICarouselInstance,
    TCarouselProps,
} from 'react-native-reanimated-carousel';

import { useTheme } from '@/theme';

const { width } = Dimensions.get('window');

export interface SwiperProps
    extends Omit<
        TCarouselProps,
        'data' | 'renderItem' | 'mode' | 'vertical' | 'modeConfig'
    > {
    children: React.ReactNode | React.ReactNode[];

    enabled?: boolean;

    onPageChange?: (idx: number) => void;

    swiperProgress: SharedValue<number>;
}

/**
 * built on top of react-native-reanimated-carousel.
 * - exposes the swipe progress
 * - peek
 */
export const Swiper = forwardRef<ICarouselInstance, SwiperProps>(
    ({ children, enabled, onPageChange, swiperProgress, ...rest }, ref) => {
        const pages = Array.isArray(children) ? children : [children];

        const cleanPages = pages.filter((i) => !!i) as JSX.Element[];

        const theme = useTheme();

        return (
            <Carousel
                {...rest}
                ref={ref}
                style={[
                    {
                        backgroundColor: theme.color.bg,
                    },
                    rest.style,
                ]}
                onProgressChange={(relativeOffset) => {
                    swiperProgress.value = -relativeOffset / width;
                }}
                onSnapToItem={onPageChange}
                loop={false}
                width={width}
                enabled={enabled}
                data={cleanPages}
                renderItem={(item) => item.item}
            />
        );
    }
);

Swiper.displayName = 'Swiper';

/**
 * @returns swiperProgress - float representing the interpolated page idx (e.g. 1.5 if the user if halfway between page 2 and 3)
 *
 * if you need to rerender when the page has changed, use `useSwiperWithPageState` instead.
 */
export function useSwiper(options?: { initialPage?: number }) {
    const initialPage = options?.initialPage ?? 0;

    const swiperProgress = useSharedValue(initialPage);

    const ref = useRef<ICarouselInstance>(null);

    useEffect(() => {
        ref.current?.scrollTo({ index: initialPage, animated: false });
    }, [initialPage]);

    return {
        swiperProgress,
        ref,
    };
}

/**
 * @returns swiperProgress - float representing the interpolated page idx (e.g. 1.5 if the user if halfway between page 2 and 3)
 *
 * if you don't need to rerender when the page has changed, use `useSwiper` instead.
 * for example, if you're swiping multiple scroll views, their scroll progress might glitch back to the top after swiping.
 */
export function useSwiperWithPageState(options?: { initialPage?: number }) {
    const initialPage = options?.initialPage ?? 0;

    const swiperProgress = useSharedValue(initialPage);

    const [swiperPage, setSwiperPage] = useState(initialPage);

    const ref = useRef<ICarouselInstance>(null);

    useEffect(() => {
        ref.current?.scrollTo({ index: initialPage, animated: false });
    }, [initialPage]);

    return {
        swiperPage,
        swiperProgress,
        ref,
        onPageChange: setSwiperPage,
    };
}
