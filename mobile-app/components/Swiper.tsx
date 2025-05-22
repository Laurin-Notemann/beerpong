import { forwardRef, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';

import { theme } from '@/theme';

const { width } = Dimensions.get('window');

export interface SwiperProps {
    children: React.ReactNode[];

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
    ({ children, enabled, onPageChange, swiperProgress }, ref) => {
        const pages = children.filter((i) => !!i) as JSX.Element[];

        return (
            <Carousel
                ref={ref}
                style={{
                    backgroundColor: theme.color.bg,
                }}
                onProgressChange={(relativeOffset) => {
                    swiperProgress.value = -relativeOffset / width;
                }}
                onSnapToItem={onPageChange}
                loop={false}
                width={width}
                enabled={enabled}
                data={pages}
                renderItem={(item) => item.item}
            />
        );
    }
);

Swiper.displayName = 'Swiper';

/**
 * @returns swiperProgress - float representing the interpolated page idx (e.g. 1.5 if the user if halfway between page 2 and 3)
 */
export function useSwiper(options?: { initialPage?: number }) {
    const swiperProgress = useSharedValue(options?.initialPage ?? 0);

    const [swiperPage, setSwiperPage] = useState(0);

    const ref = useRef<ICarouselInstance>(null);

    return {
        swiperPage,
        swiperProgress,
        ref,
        onPageChange: setSwiperPage,
    };
}
