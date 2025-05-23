import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import Stepper from '@/components/Stepper';
import Text from '@/components/Text';
import { TutorialBubble } from '@/components/TutorialBubble';
import { triggerHapticBump } from '@/haptics';
import { useTutorials } from '@/zustand/tutorialStore';

const clamp = (num: number, min: number, max: number) => {
    return num <= min ? min : num >= max ? max : num;
};

export interface ScoredMoveInputRowProps {
    moveName: string;
    numScored: number;
    onNumScoredChange: (value: number) => void;

    /** how quickly the count changes on horizontal drag. defaults to `0.5` */
    dragSensitivity?: number;
    /** defaults to `99` */
    maxValue?: number;

    hasTutorial?: boolean;
}

/**
 * used to assign how many instances of a specific move a specific player scored, e.g. "3x Bouncer" or "1x Trickshot".
 * - has two buttons to increment/decrement the count
 * - on tap, the count is incremented by 1
 * - on horizontal drag, the count is incremented/decremented like a slider. `onChange` only fires after the drag ends.
 *
 * TODO: don't activate the horizontal drag gesture on very quick drags, so users can still swipe left and right
 * TODO: tap can currently increment the count to be higher than the maxValue
 */
export const ScoredMoveInputRow: React.FC<ScoredMoveInputRowProps> = ({
    moveName,
    numScored,
    onNumScoredChange,

    maxValue = 99,
    dragSensitivity = 0.5,
    hasTutorial = false,
}) => {
    // used to make ui updates to the count less sluggish when the user drags or taps. setting this only updates the ui, and doesn't notify the parent.
    const [uiCount, setUiCount] = useState(numScored);

    useEffect(() => {
        setUiCount(numScored);
    }, [numScored]);

    const { setHasDraggedToAssignPoints } = useTutorials();

    const onHorizontalDrag = (horizontalDragDistance: number) => {
        const change = Math.round(
            horizontalDragDistance / (10 / dragSensitivity)
        );
        // integer between 0 and MAX_VALUE
        const newValue = clamp(numScored + change, 0, maxValue);

        setUiCount((prev) => {
            const hasChanged = prev !== newValue;

            if (hasChanged) {
                triggerHapticBump('selection');
                setHasDraggedToAssignPoints();
            }

            return newValue;
        });
    };

    const dragDecreaseDisabled = false;
    const dragIncreaseDisabled = false;

    const slideToChangeValue = Gesture.Pan()
        // only activate if horizontal swipe distance exceeds ±5px, so we don't intercept pull-down gestures on the parent modal
        .activeOffsetX([
            dragDecreaseDisabled ? -999 : -5,
            dragIncreaseDisabled ? 999 : 5,
        ])
        .onUpdate((e) => runOnJS(onHorizontalDrag)(e.translationX))
        .onEnd(() => runOnJS(onNumScoredChange)(uiCount));

    const incrementOnTap = Gesture.Tap().onEnd(() => {
        runOnJS(triggerHapticBump)('selection');
        runOnJS(setUiCount)(uiCount + 1);
        runOnJS(onNumScoredChange)(uiCount + 1);
    });

    return (
        <View
            style={{
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',

                height: 44,
                paddingLeft: 64,
                paddingRight: 64 - 8,
            }}
        >
            {hasTutorial && (
                <TutorialBubble
                    text="Try pulling this to the right!"
                    left={12}
                    top={12}
                />
            )}
            <GestureDetector
                gesture={Gesture.Exclusive(slideToChangeValue, incrementOnTap)}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',

                        flex: 1,
                        height: '100%',
                    }}
                >
                    <Text
                        variant="body1"
                        color="primary"
                        style={{
                            alignItems: 'center',
                        }}
                        numberOfLines={1}
                    >
                        {moveName}
                    </Text>
                </View>
            </GestureDetector>
            <Stepper
                value={uiCount}
                onChange={onNumScoredChange}
                min={0}
                max={maxValue}
            />
        </View>
    );
};
