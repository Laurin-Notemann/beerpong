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
    /** A suggestion highlight in drawn grid coordinates; never changes cup state. */
    highlightedCup?: { x: number; y: number };
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
     * dragging from a standing cup (ignored if `canEdit` is true): `touch` reserves the
     * gesture for the cup, `start` opens the scorer menu, `move` picks a scorer, `end` records
     * the hit, and `cancel` releases the gesture, including a touch that stayed a tap
     */
    onCupDrag?: (event: CupDragEvent) => void;
    /** drawn over the cups, e.g. a menu at a dragged cup's `center` */
    children?: React.ReactNode;
}

export interface CupDragEvent {
    phase: 'touch' | 'start' | 'move' | 'end' | 'cancel';
    cup: { x: number; y: number };
    /** the cup's middle, within the grid */
    center: { x: number; y: number };
    /** movement from where the finger first touched the cup */
    dx: number;
    dy: number;
}

/** a little movement separates a drag from a tap, without waiting for a hold */
const DRAG_DISTANCE = 8;

const CupGrid = ({
    color = '#EE4A58', // our red color
    width,
    highlightedCup,

    canEdit = false,
    canAddOrRemoveCups = canEdit,
    showGrid = canEdit,

    formation = Formation.Pyramid_10,
    onChange = () => {},
    onCupTap,
    onCupDrag,
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

    const getCupDragGesture = (cup: (typeof cups)[number]) => {
        const at = {
            cup: { x: cup.x, y: cup.y },
            center: {
                x: cup.pos.posX + cupRadius,
                y: cup.pos.posY + cupRadius,
            },
        };
        const send = (phase: CupDragEvent['phase'], dx: number, dy: number) =>
            onCupDrag?.({ phase, ...at, dx, dy });

        return Gesture.Pan()
            .minDistance(DRAG_DISTANCE)
            .onTouchesDown(() => runOnJS(send)('touch', 0, 0))
            .onStart((e) =>
                runOnJS(send)('start', e.translationX, e.translationY)
            )
            .onUpdate((e) =>
                runOnJS(send)('move', e.translationX, e.translationY)
            )
            .onEnd((e, success) =>
                runOnJS(send)(
                    success ? 'end' : 'cancel',
                    e.translationX,
                    e.translationY
                )
            )
            .onFinalize(() => runOnJS(send)('cancel', 0, 0));
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
                            highlighted={
                                highlightedCup?.x === cup.x &&
                                highlightedCup?.y === cup.y
                            }
                            // editing moves cups; pro mode drags pick the scorer
                            onPan={canEdit ? getCupPanGesture(cup) : undefined}
                            onQuickDrag={
                                !canEdit && onCupDrag
                                    ? getCupDragGesture(cup)
                                    : undefined
                            }
                            onTap={
                                canEdit
                                    ? getCupTapGesture(cup)
                                    : Gesture.Tap().onEnd(
                                          (_, success) =>
                                              success &&
                                              onCupTap &&
                                              runOnJS(onCupTap)?.(cup)
                                      )
                            }
                        />
                    );
                })}
                {children && (
                    <View
                        pointerEvents="box-none"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            // Cups use their pixel y position as zIndex; overlays must clear every row.
                            zIndex:
                                Math.max(
                                    0,
                                    ...cups.map((cup) =>
                                        Math.round(cup.pos.posY)
                                    )
                                ) + 1,
                        }}
                    >
                        {children}
                    </View>
                )}
            </View>
        </GestureDetector>
    );
};
export default CupGrid;
