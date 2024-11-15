import React from "react";

import { View } from "react-native";
import TextInput from "../TextInput";
import { ThemedText } from "../ThemedText";
import { theme } from "@/theme";
import Avatar from "../Avatar";
import { ThemedView } from "../ThemedView";

export interface GroupMember {
  name: string;
}

export interface CreateGroupProps {
  members: GroupMember[];

  onCreateMember: (name: string) => void;
}
export default function CreateGroup({
  members,
  onCreateMember,
}: CreateGroupProps) {
  return (
    <>
      <View
        style={{
          height: 64,
        }}
      ></View>
      <View
        style={{
          backgroundColor: "black",
          flex: 1,

          padding: 16,
        }}
      >
        <TextInput
          required
          placeholder="Group member name"
          returnKeyType="done"
          onSubmitEditing={(event) => {
            onCreateMember(event.nativeEvent.text);
          }}
        />
        {members.map((i, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              alignItems: "center",

              height: 60.5,
              paddingHorizontal: 20,
            }}
          >
            <Avatar name={i.name} size={36} />
            <ThemedView
              style={{
                marginLeft: 12,
              }}
            >
              <ThemedText
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  color: theme.color.text.primary,
                }}
              >
                {i.name}
              </ThemedText>
            </ThemedView>
          </View>
        ))}
      </View>
    </>
  );
}
