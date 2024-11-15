import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Cup } from "./Cup";
import { Formation, FormationType } from "./Formation";
import Point from "./Point";
import { useCupGrid } from "./useCupGrid";
import { theme } from "@/theme";

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
}

const CupGrid = ({
  color = theme.color.team.red,
  width,

  canEdit = false,
  canAddOrRemoveCups = canEdit,
  showGrid = canEdit,

  formation = Formation.Pyramid_10,
  onChange = () => {},
  onCupTap,
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

  return (
    <GestureDetector gesture={containerTapGesture}>
      <View style={{ width, height, backgroundColor: "none" }}>
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
              onPan={getCupPanGesture(cup)}
              onTap={
                canEdit
                  ? getCupTapGesture(cup)
                  : Gesture.Tap().onEnd(() => onCupTap?.(cup))
              }
            />
          );
        })}
      </View>
    </GestureDetector>
  );
};
export default CupGrid;
