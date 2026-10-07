import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Cup } from '@/components/CupGrid/Cup';
import { Formation, FormationType } from '@/components/CupGrid/Formation';
import Point from '@/components/CupGrid/Point';
import { useCupGrid } from '@/components/CupGrid/useCupGrid';

export interface CupFormationProps {
    /**
     * the color of the cups. can be overwritten for an individual cup in the `formation` parameter
     *
     * @default #EE4A58 (our red color)
     */
    color?: string;
    /**
     * scales the cup formation to the specified width
     *
     * TODO: default to width of parent?
     */
    width: number;

    /**
     * whether cups can be moved using drag and drop.
     * if true, the `onChange` parameter is used when the user changes the formation
     *
     * @default false
     */
    canEdit?: boolean;
    /**
     * given `canEdit` is true, whether the amount of cups is fixed or the player can add or remove them.
     *
     * @default value of the canEdit parameter
     */
    canAddOrRemoveCups?: boolean;

    /**
     * whether to show the dotted background grid
     *
     * @default value of the canEdit parameter
     */
    showGrid?: boolean;

    /**
     * the shape and color of the cups
     *
     * @default a 10-cup pyramid
     */
    formation?: FormationType;
    /**
     * if `canEdit` is true, this callback is triggered when the user makes changes to the cup formation
     */
    onChange?: (formation: FormationType) => void;

    /**
     * gets ignored if `canEdit` is true
     */
    onCupTap?: (cup: { x: number; y: number }) => void;
    /**
     * holding a standing cup instead of tapping it (ignored if `canEdit` is true): `start` once
     * the hold is recognized, `move` while the finger drags, `end` when it lets go and `cancel`
     * if the gesture was interrupted
     */
    onCupHold?: (event: CupHoldEvent) => void;
    /** drawn over the cups, e.g. a menu at a held cup's `center` */
    children?: React.ReactNode;
}

export interface CupHoldEvent {
    phase: 'start' | 'move' | 'end' | 'cancel';
    cup: { x: number; y: number };
    /** the cup's middle, within the grid */
    center: { x: number; y: number };
    /** how far the finger moved since the hold started */
    dx: number;
    dy: number;
}

/** how long a cup has to be held before it's a hold, not a tap */
const HOLD_MS = 250;

const CupGrid = ({
    color = '#EE4A58', // our red color
    width,

    canEdit = false,
    canAddOrRemoveCups = canEdit,
    showGrid = canEdit,

    formation = Formation.Pyramid_10,
    onChange = () => {},
    onCupTap,
    onCupHold,
    children,
}: CupFormationProps) => {
    const {
        height,
        cups,
        gridPoints,
        cupRadius,
        getCupPanGesture,
        getCupTapGesture,
        containerTapGesture,
    } = useCupGrid({
        width,
        canEdit,
        canAddOrRemoveCups,
        formation,
        onChange,
    });

    const getCupHoldGesture = (cup: (typeof cups)[number]) => {
        const at = {
            cup: { x: cup.x, y: cup.y },
            center: {
                x: cup.pos.posX + cupRadius,
                y: cup.pos.posY + cupRadius,
            },
        };
        const send = (phase: CupHoldEvent['phase'], dx: number, dy: number) =>
            onCupHold?.({ phase, ...at, dx, dy });

        return Gesture.Pan()
            .activateAfterLongPress(HOLD_MS)
            .onStart(() => runOnJS(send)('start', 0, 0))
            .onUpdate((e) =>
                runOnJS(send)('move', e.translationX, e.translationY)
            )
            .onEnd((e, success) =>
                runOnJS(send)(
                    success ? 'end' : 'cancel',
                    e.translationX,
                    e.translationY
                )
            );
    };

    return (
        <GestureDetector gesture={containerTapGesture}>
            <View style={{ width, height, backgroundColor: 'none' }}>
                {showGrid &&
                    gridPoints.map((point, index) => {
                        return (
                            <Point
                                key={index}
                                size={width / 40}
                                x={point.posX + cupRadius}
                                y={point.posY + cupRadius}
                            />
                        );
                    })}
                {cups.map((cup) => {
                    return (
                        <Cup
                            key={cup.id}
                            disabled={cup.disabled}
                            color={cup.color || color}
                            x={cup.pos.posX}
                            y={cup.pos.posY}
                            width={cupRadius * 2}
                            // only an editable grid moves cups; otherwise a drag
                            // that starts on a cup should still scroll the page
                            onPan={canEdit ? getCupPanGesture(cup) : undefined}
                            onHold={
                                !canEdit && onCupHold
                                    ? getCupHoldGesture(cup)
                                    : undefined
                            }
                            onTap={
                                canEdit
                                    ? getCupTapGesture(cup)
                                    : Gesture.Tap().onEnd(
                                          () =>
                                              onCupTap &&
                                              runOnJS(onCupTap)?.(cup)
                                      )
                            }
                        />
                    );
                })}
                {children}
            </View>
        </GestureDetector>
    );
};
export default CupGrid;
