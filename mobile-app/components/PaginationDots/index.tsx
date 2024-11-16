/**
 *
 * Created by rouge on 11/09/2019.
 * Converted to Typescript on 14/07/2020.
 * Converted to Functional component. on 21/09/2021
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

import Dot from './component/Dot';
import EmptyDot, { defaultEmptyDotSize } from './component/EmptyDot';

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

export interface IDotContainerProps {
    curPage: number | Animated.Value | Animated.AnimatedInterpolation<number>;
    maxPage: number;
    sizeRatio?: number;
    activeDotColor: string;
    inactiveDotColor?: string;
    vertical?: boolean;
}

const ONE_EMPTY_DOT_SIZE = defaultEmptyDotSize * defaultEmptyDotSize;

const DotContainer: React.FC<IDotContainerProps> = (props) => {
    useEffect(() => {
        return () => {
            (
                props.curPage as Animated.AnimatedInterpolation<number>
            ).removeAllListeners();
        };
    }, [props.curPage]);

    const refScrollView = useRef<ScrollView>(null);
    const prevPage = usePrevious(props.curPage);

    const getSizeRatio = useCallback<() => number>(() => {
        if (!props.sizeRatio) return 1.0;

        return Math.max(1.0, props.sizeRatio);
    }, [props.sizeRatio]);

    const scrollTo = useCallback<(index: number, animated?: boolean) => void>(
        (index, animated = true) => {
            if (!refScrollView.current) return;

            const sizeRatio = getSizeRatio();
            const FIRST_EMPTY_DOT_SPACE = ONE_EMPTY_DOT_SIZE * 2;
            const MOVE_DISTANCE = ONE_EMPTY_DOT_SIZE * sizeRatio;

            const moveTo = Math.max(
                0,
                FIRST_EMPTY_DOT_SPACE + (index - 4) * MOVE_DISTANCE
            );

            if (props.vertical) {
                refScrollView.current.scrollTo({
                    x: 0,
                    y: moveTo,
                    animated,
                });
                return;
            }

            refScrollView.current.scrollTo({
                x: moveTo,
                y: 0,
                animated,
            });
        },
        [getSizeRatio, props.vertical]
    );

    const getContainerStyle = useCallback<() => StyleProp<ViewStyle>>(() => {
        const { vertical } = props;
        const sizeRatio = getSizeRatio();
        const containerSize = 84 * sizeRatio;

        return {
            alignItems: 'center',
            flexDirection: vertical ? 'column' : 'row',
            maxHeight: vertical ? containerSize : undefined,
            maxWidth: vertical ? undefined : containerSize,
        };
    }, [getSizeRatio, props]);

    const { curPage, maxPage, activeDotColor, inactiveDotColor } = props;
    const list = useMemo(() => [...Array(maxPage).keys()], [maxPage]);

    const normalizedPage = useMemo(() => {
        if (typeof curPage === 'number') {
            return Math.min(Math.max(curPage, 0), maxPage - 1);
        }

        // If curPage is an Animated.Value, return it directly.
        return curPage;
    }, [curPage, maxPage]);

    useEffect(() => {
        if (props.maxPage > 4 && prevPage !== props.curPage) {
            if (typeof props.curPage === 'number') {
                scrollTo(props.curPage);
            }
        }
    }, [prevPage, props.curPage, props.maxPage, scrollTo]);

    const sizeRatio = getSizeRatio();

    const container = getContainerStyle();

    if (maxPage < 5) {
        return (
            <View style={container}>
                {list.map((i) => {
                    return (
                        <Dot
                            key={i}
                            idx={i}
                            sizeRatio={sizeRatio}
                            curPage={normalizedPage}
                            maxPage={maxPage}
                            activeColor={activeDotColor}
                            inactiveColor={inactiveDotColor}
                        />
                    );
                })}
            </View>
        );
    }

    return (
        <View
            style={container}
            onLayout={() => {
                if (typeof props.curPage === 'number') {
                    scrollTo(props.curPage, false);
                }
            }}
        >
            <ScrollView
                ref={refScrollView}
                contentContainerStyle={styles.scrollViewContainer}
                bounces={false}
                horizontal={!props.vertical}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            >
                {/* previous empty dummy dot */}
                <EmptyDot sizeRatio={sizeRatio} />
                <EmptyDot sizeRatio={sizeRatio} />

                {list.map((i) => {
                    return (
                        <Dot
                            sizeRatio={sizeRatio}
                            key={i}
                            idx={i}
                            curPage={normalizedPage}
                            maxPage={maxPage}
                            activeColor={activeDotColor}
                            inactiveColor={inactiveDotColor}
                        />
                    );
                })}

                {/* previous empty dummy dot */}
                <EmptyDot sizeRatio={sizeRatio} />
                <EmptyDot sizeRatio={sizeRatio} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollViewContainer: {
        alignItems: 'center',
    },
});

export default DotContainer;
