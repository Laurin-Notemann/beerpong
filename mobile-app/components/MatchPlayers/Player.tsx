import React, { useRef, useState } from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  Animated,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";

import { theme } from "@/theme";
import Avatar from "@/components/Avatar";
import { useNavigation } from "expo-router";
import Text from "../Text";
import { mockMoves } from "../mockData/moves";

export default function Player({
  team,
  name,
  points,
  change,

  expanded,
  setIsExpanded,
  editable = false,
}: {
  team: "red" | "blue";
  name: string;
  points: number;
  change: number;

  expanded: boolean;
  setIsExpanded: (value: boolean) => void;
  editable?: boolean;
}) {
  const animation = useRef(new Animated.Value(0)).current; // start with height 0

  const toggleCollapse = () => {
    // Animate the height when toggling
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1, // expand or collapse
      duration: 300, // animation duration in ms
      useNativeDriver: false, // we animate height, which cannot use native driver
    }).start();

    setIsExpanded(!expanded);
  };

  // Interpolate the animated value to control height
  const contentHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44 * 8], // customize the height range based on your content
  });

  const navigation = useNavigation();

  const [moves, setMoves] = useState(
    mockMoves.map((i) => ({ ...i, count: 0 }))
  );

  return (
    <>
      <TouchableHighlight
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 76,
          paddingHorizontal: 15,

          borderTopWidth: 0.5,
          borderTopColor: theme.panel.light.active,
        }}
        onPress={
          // @ts-ignore
          editable ? toggleCollapse : () => navigation.navigate("player")
        }
        underlayColor={theme.panel.light.active}
      >
        <>
          <Avatar size={40} name={name} borderColor={theme.color.team[team]} />
          <View style={{ marginLeft: 16 }}>
            <Text variant="body1" color="primary">
              {name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {editable ? (
                <Text variant="body2" color="tertiary">
                  {points} points
                </Text>
              ) : (
                <Text variant="body2" color="tertiary">
                  5 normal, 2 bouncer, Save, Ring of Fire
                </Text>
              )}
              <Icon
                color={
                  change >= 0 ? theme.color.positive : theme.color.negative
                }
                size={8}
                name="triangle"
                style={{
                  marginLeft: 8,
                  marginRight: 2,
                  marginTop: 1,
                  transform: change >= 0 ? undefined : [{ rotateX: "180deg" }],
                }}
              />
              <Text
                variant="body2"
                color={change >= 0 ? "positive" : "negative"}
              >
                {Math.abs(change)}
              </Text>
            </View>
          </View>
          {editable ? (
            <Icon
              color={theme.icon.primary}
              size={24}
              name="chevron-down"
              style={{ marginLeft: "auto" }}
            />
          ) : (
            <Icon
              color={theme.icon.secondary}
              size={24}
              name="chevron-right"
              style={{ marginLeft: "auto" }}
            />
          )}
        </>
      </TouchableHighlight>
      {editable && (
        <Animated.View style={[{ overflow: "hidden", height: contentHeight }]}>
          {moves.map((i, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",

                height: 44,
                paddingLeft: 64,
                paddingRight: 16,
              }}
            >
              <Text
                variant="body1"
                color="primary"
                style={{
                  marginRight: "auto",
                }}
              >
                {i.title}
              </Text>
              <TouchableOpacity
                disabled={i.count < 1}
                style={{
                  alignItems: "center",
                  justifyContent: "center",

                  width: 44,
                  height: 44,

                  opacity: i.count < 1 ? 0.2 : 1,
                }}
                onPress={() =>
                  setMoves((prev) => {
                    const newMoves = JSON.parse(
                      JSON.stringify(prev)
                    ) as typeof prev;

                    const old = newMoves.find((j) => j.title === i.title)!;

                    if (old.count > 0) old.count -= 1;

                    return newMoves;
                  })
                }
              >
                <Icon
                  color={theme.color.text.secondary}
                  size={24}
                  name="minus"
                />
              </TouchableOpacity>

              <Text variant="body1" color="primary">
                {i.count}
              </Text>
              <TouchableOpacity
                style={{
                  alignItems: "center",
                  justifyContent: "center",

                  width: 44,
                  height: 44,
                }}
                onPress={() =>
                  setMoves((prev) => {
                    const newMoves = JSON.parse(
                      JSON.stringify(prev)
                    ) as typeof prev;

                    const old = newMoves.find((j) => j.title === i.title)!;

                    old.count += 1;

                    return newMoves;
                  })
                }
              >
                <Icon
                  color={theme.color.text.secondary}
                  size={24}
                  name="plus"
                />
              </TouchableOpacity>
            </View>
          ))}
        </Animated.View>
      )}
    </>
  );
}
