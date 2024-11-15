import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

import { CupFormationProps } from ".";
import { FormationCup } from "./Formation";

type Required<T> = {
  [P in keyof T]-?: T[P];
};

interface Point {
  /**
   * the x coordinate within the 7x7 grid (e.g. 2)
   */
  x: number;
  /**
   * the y coordinate within the 7x7 grid (e.g. 3)
   */
  y: number;
  /**
   * the css x coordinate of the point (e.g. 364)
   */
  posX: number;
  /**
   * the css y coordinate of the point (e.g. 492)
   */
  posY: number;
}

interface Cup {
  id: number;

  pos: Point;
}

export type UseCupGridProps = Required<
  Pick<
    CupFormationProps,
    "width" | "canEdit" | "canAddOrRemoveCups" | "formation" | "onChange"
  >
>;

export function useCupGrid({
  width,
  canEdit,
  canAddOrRemoveCups,
  formation,
  onChange,
}: UseCupGridProps) {
  const { rows, columns } = formation;

  const cupRadius = width / Math.ceil(columns / 2) / 2;

  const xSpacing = width / (columns + 1);
  // our grid has more less ySpacing than xSpacing, which makes our cup pyramid look nice and sexy
  const ySpacing = xSpacing * 0.86;
  const height = (columns - 1) * ySpacing + cupRadius * 2;

  const gridPoints = Array(rows)
    .fill(0)
    .map((_, y) =>
      Array(columns)
        .fill(0)
        .map((_, x) => ({
          x,
          y,
          posX: x * xSpacing,
          posY: y * ySpacing,
        }))
    )
    .flat();

  function setCups(cups: Cup[]) {
    // ReactNativeHapticFeedback.trigger("impactLight");

    const newCups = cups.map((i) => ({ ...i, x: i.pos.x, y: i.pos.y }));

    onChange({
      ...formation,
      cups: newCups,
    });
  }

  const cups = formation.cups
    .map<Cup & FormationCup>((cup, idx) => ({
      ...cup,
      id: idx,
      pos: gridPoints[cup.y * columns + cup.x],
    }))
    .filter((i) => i.pos != null);

  const draggedCup = useSharedValue<Cup | null>(null);

  const getCupPanGesture = (cup: Cup) =>
    Gesture.Pan()
      .onStart(() => {
        draggedCup.value = cup;
      })
      .onChange((event) => {
        if (!canEdit) return;
        if (!draggedCup.value) return;

        // event.translationX and event.translationY can be null if the gesture is just a tap and not a drag!
        const currentX = draggedCup.value.pos.posX + (event.translationX ?? 0);
        const currentY = draggedCup.value.pos.posY + (event.translationY ?? 0);

        let closestGridPoint = {
          ...gridPoints[0],
          distance: Infinity,
        };

        for (const point of gridPoints) {
          const distance = Math.sqrt(
            (currentX - point.posX) ** 2 + (currentY - point.posY) ** 2
          );
          const isClosest = distance < closestGridPoint.distance;

          const isOccupied = cups.some(
            (i) =>
              i.id !== cup.id &&
              Math.abs(i.pos.x - point.x) < 2 &&
              Math.abs(i.pos.y - point.y) < 2
          );

          if (isClosest && !isOccupied) {
            closestGridPoint = { ...point, distance };
          }
        }
        const stateDidntChange =
          cup.pos.x === closestGridPoint.x && cup.pos.y === closestGridPoint.y;

        if (stateDidntChange) return;

        const stateCup = cups.find((i) => i.id === cup.id);

        if (!stateCup) return;

        stateCup.pos.x = closestGridPoint.x;
        stateCup.pos.y = closestGridPoint.y;

        runOnJS(setCups)(cups);
      })
      .onEnd(() => {
        draggedCup.value = null;
      });

  const getCupTapGesture = (cup: Cup) =>
    Gesture.Tap().onEnd(() => {
      if (!canEdit || !canAddOrRemoveCups) return;

      runOnJS(setCups)(cups.filter((i) => i.id !== cup.id));
    });

  const containerTapGesture = Gesture.Tap().onEnd((event) => {
    if (!canEdit || !canAddOrRemoveCups) return;

    let closestGridPoint = {
      ...gridPoints[0],
      distance: Infinity,
    };

    for (const point of gridPoints) {
      const distance = Math.sqrt(
        (event.x - point.posX - cupRadius) ** 2 +
          (event.y - point.posY - cupRadius) ** 2
      );
      const isClosest = distance < closestGridPoint.distance;

      const isOccupied = cups.some(
        (i) =>
          Math.abs(i.pos.x - point.x) < 2 && Math.abs(i.pos.y - point.y) < 2
      );

      if (isClosest && !isOccupied) {
        closestGridPoint = { ...point, distance };
      }
    }

    if (closestGridPoint.distance < Infinity) {
      const newCup = {
        id: Math.random(),
        x: closestGridPoint.x,
        y: closestGridPoint.y,
        pos: closestGridPoint,
      };
      runOnJS(setCups)(cups.concat([newCup]));
    }
  });

  return {
    height,
    cups,
    gridPoints,
    cupRadius,

    getCupPanGesture,
    getCupTapGesture,
    containerTapGesture,
  };
}
