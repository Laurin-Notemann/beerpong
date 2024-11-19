import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

import EmptyDot from './EmptyDot';

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

type IDotStyle = {
    size: number;
    opacity: number;
};

enum EnumDotType {
    ACTIVE,
    INACTIVE,
    MEDIUM,
    SMALL,
}

const DotStyle = {
    [EnumDotType.INACTIVE]: {
        size: 8,
        opacity: 0.2,
    },
    [EnumDotType.ACTIVE]: {
        size: 8,
        opacity: 1.0,
    },
    [EnumDotType.MEDIUM]: {
        size: 5,
        opacity: 0.2,
    },
    [EnumDotType.SMALL]: {
        size: 3,
        opacity: 0.2,
    },
};

type getDotStylePayload = {
    idx: number;
    curPage: number | Animated.Value | Animated.AnimatedInterpolation<number>;
    maxPage: number;
};

const getDotStyle = ({
    idx,
    curPage,
    maxPage,
}: getDotStylePayload): IDotStyle => {
    let type = EnumDotType.SMALL;
    let currentPage = typeof curPage === 'number' ? curPage : 0; // Default to 0 if not a number

    if (maxPage < 5) {
        return DotStyle[
            idx === currentPage ? EnumDotType.ACTIVE : EnumDotType.INACTIVE
        ];
    }

    if (currentPage < 3) {
        if (idx < 3) {
            type = EnumDotType.INACTIVE;
            if (currentPage === idx) {
                type = EnumDotType.ACTIVE;
            }
        } else if (idx < 4) {
            type = EnumDotType.MEDIUM;
        } else {
            type = EnumDotType.SMALL;
        }
    } else if (currentPage === 3) {
        if (idx < 4) {
            if (idx === 0) {
                type = EnumDotType.MEDIUM;
            } else {
                type = EnumDotType.INACTIVE;

                if (currentPage === idx) {
                    type = EnumDotType.ACTIVE;
                }
            }
        } else if (currentPage + 1 === idx) {
            type = EnumDotType.MEDIUM;
        } else {
            type = EnumDotType.SMALL;
        }
    } else {
        if (idx > currentPage) {
            if (idx === currentPage + 1) {
                type = EnumDotType.MEDIUM;
            }
        } else if (idx < currentPage) {
            if (idx >= currentPage - 2) {
                type = EnumDotType.INACTIVE;
            } else if (idx === currentPage - 3) {
                type = EnumDotType.MEDIUM;
            }
        } else {
            type = EnumDotType.ACTIVE;
        }
    }

    return DotStyle[type];
};

const Dot: React.FC<{
    idx: number;
    curPage: number | Animated.Value | Animated.AnimatedInterpolation<number>;
    maxPage: number;
    activeColor: string;
    inactiveColor?: string;
    sizeRatio: number;
}> = (props) => {
    const [animVal] = useState(new Animated.Value(0));
    const [animate, setAnimate] = useState(false);
    const [type, setType] = useState(() =>
        getDotStyle({
            idx: props.idx,
            curPage: typeof props.curPage === 'number' ? props.curPage : 0, // Default to 0 if not a number
            maxPage: props.maxPage,
        })
    );

    const [dotColor, setDotColor] = useState<string>(() => {
        if (props.curPage === props.idx) {
            //its current active page now
            return props.activeColor;
        }

        return props.inactiveColor ?? props.activeColor;
    });

    const prevType = usePrevious(type);
    const prevDotColor = usePrevious<string>(dotColor);

    useEffect(() => {
        const nextType = getDotStyle({
            idx: props.idx,
            curPage: props.curPage,
            maxPage: props.maxPage,
        });

        const nextAnimate =
            nextType.size !== (prevType?.size || 3) ||
            nextType.opacity !== (prevType?.opacity || 0.2);
        if (props.curPage === props.idx) {
            setDotColor(props.activeColor);
        } else {
            setDotColor(props.inactiveColor ?? props.activeColor);
        }

        setType(nextType);
        setAnimate(nextAnimate);
    }, [
        prevType?.opacity,
        prevType?.size,
        props.activeColor,
        props.curPage,
        props.idx,
        props.inactiveColor,
        props.maxPage,
    ]);

    useEffect(() => {
        if (!animate) return;

        animVal.setValue(0);

        Animated.timing(animVal, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [animVal, animate, prevType, type]);

    useEffect(() => {
        return () => {
            (
                props.curPage as Animated.AnimatedInterpolation<number>
            ).removeAllListeners();
        };
    }, [props.curPage]);

    const style = useMemo(() => {
        const size = props.curPage.interpolate({
            inputRange: [0, 1],
            outputRange: [
                (prevType?.size || 3) * props.sizeRatio,
                type.size * props.sizeRatio,
            ],
        });

        const backgroundColor = props.curPage.interpolate({
            inputRange: [0, 1],
            outputRange: [prevDotColor ?? props.activeColor, dotColor],
        });

        return {
            width: size,
            height: size,
            backgroundColor,
            borderRadius: props.curPage.interpolate({
                inputRange: [0, 1],
                outputRange: [
                    (prevType?.size || 3) * props.sizeRatio * 0.5,
                    type.size * props.sizeRatio * 0.5,
                ],
            }),
            opacity: props.curPage.interpolate({
                inputRange: [0, 1],
                outputRange: [prevType?.opacity || 0.2, type.opacity],
            }),
        };
    }, [
        props.curPage,
        dotColor,
        prevDotColor,
        prevType?.opacity,
        prevType?.size,
        props.activeColor,
        props.sizeRatio,
        type.opacity,
        type.size,
    ]);

    const animStyle = useMemo(() => {
        const size = animVal.interpolate({
            inputRange: [0, 1],
            outputRange: [
                (prevType?.size || 3) * props.sizeRatio,
                type.size * props.sizeRatio,
            ],
        });

        const backgroundColor = animVal.interpolate({
            inputRange: [0, 1],
            outputRange: [prevDotColor ?? props.activeColor, dotColor],
        });

        return {
            width: size,
            height: size,
            backgroundColor,
            borderRadius: animVal.interpolate({
                inputRange: [0, 1],
                outputRange: [
                    (prevType?.size || 3) * props.sizeRatio * 0.5,
                    type.size * props.sizeRatio * 0.5,
                ],
            }),
            opacity: animVal.interpolate({
                inputRange: [0, 1],
                outputRange: [prevType?.opacity || 0.2, type.opacity],
            }),
        };
    }, [
        animVal,
        dotColor,
        prevDotColor,
        prevType?.opacity,
        prevType?.size,
        props.activeColor,
        props.sizeRatio,
        type.opacity,
        type.size,
    ]);

    let curPageNumber: number;

    if (typeof props.curPage === 'number') {
        curPageNumber = props.curPage;
    } else if (props.curPage instanceof Animated.Value) {
        curPageNumber = props.curPage.__getValue();
    } else {
        const inputRange = Array.from({ length: props.maxPage }, (_, i) => i);
        const outputRange = inputRange;

        // Assuming you want to interpolate the current value
        curPageNumber = props.curPage.interpolate({
            inputRange,
            outputRange,
        }) as unknown as number; // NOTE: You'll need to ensure this is used correctly, as interpolation returns an Animated.AnimatedInterpolation
    }

    if (curPageNumber < 3) {
        if (props.idx >= 5) return <EmptyDot sizeRatio={props.sizeRatio} />;
    } else if (curPageNumber < 4) {
        if (props.idx > 5) return <EmptyDot sizeRatio={props.sizeRatio} />;
    }

    return (
        <Animated.View
            style={[
                {
                    margin: 3 * props.sizeRatio,

                    width: 12,
                    height: 12,

                    backgroundColor: 'red',

                    borderRadius: 6,
                },
                // animStyle,
            ]}
        />
    );

    return (
        <Animated.View
            style={[
                {
                    margin: 3 * props.sizeRatio,
                },
                animStyle,
            ]}
        />
    );
};

export default Dot;
