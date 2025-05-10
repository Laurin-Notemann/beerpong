import React, { useEffect } from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { triggerHapticBump } from '@/haptics';

import Stepper from './Stepper';
import Text from './Text';

const DRAG_SENSITIVITY = 0.5;
const MAX_VALUE = 99;

export default function MoveRow({
    title,
    count,
    onChange,
}: {
    title: string;
    count: number;
    onChange: (value: number) => void;
}) {
    const [value, setValue] = useState(count);

    useEffect(() => {
        setValue(count);
    }, [count]);

    const updateCount = (delta: number) => {
        const sache = (() => {
            const newValue =
                count + Math.round(delta / (10 / DRAG_SENSITIVITY));

            if (newValue < 0) return 0;
            if (newValue > MAX_VALUE) return MAX_VALUE;
            return newValue;
        })();
        setValue((prev) => {
            if (prev !== sache) {
                triggerHapticBump('selection');
            }
            return sache;
        });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            runOnJS(updateCount)(event.translationX);
        })
        .onEnd(() => {
            runOnJS(onChange)(value);
        });

    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(triggerHapticBump)('selection');
        // also setting value here to rerender more quickly.
        // otherwise, the input will only rerender after the useEffect, which feels sluggish.
        runOnJS(setValue)(value + 1);
        runOnJS(onChange)(value + 1);
    });

    return (
        <GestureDetector gesture={Gesture.Exclusive(panGesture, tapGesture)}>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: 44,
                    paddingLeft: 64,
                    paddingRight: 16,
                }}
            >
                <Text
                    variant="body1"
                    color="primary"
                    style={{
                        marginRight: 'auto',
                    }}
                >
                    {title}
                </Text>
                <Stepper
                    value={value}
                    onChange={onChange}
                    min={0}
                    max={MAX_VALUE}
                />
            </View>
        </GestureDetector>
    );
}
