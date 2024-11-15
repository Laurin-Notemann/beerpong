import Button from "@/components/Button";
import { theme } from "@/theme";
import { Stack, useNavigation } from "expo-router";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";

// @ts-ignore
import SmoothPinCodeInput from "react-native-smooth-pincode-input";

export default function Page() {
  const [code, setCode] = useState("");

  const [values, setValues] = useState([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);

  const navigation = useNavigation();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          alignItems: "center",

          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 128,

          backgroundColor: theme.color.bg,
        }}
      >
        <View
          style={{
            flexDirection: "row",

            gap: 8,
          }}
        >
          {values.map((group, groupIdx) => {
            return (
              <>
                {groupIdx > 0 && (
                  <Text
                    key={groupIdx}
                    style={{
                      lineHeight: 38,

                      fontSize: 22,

                      color: theme.color.text.tertiary,
                    }}
                  >
                    -
                  </Text>
                )}
                {group.map((value, idx) => {
                  return (
                    <TextInput
                      selectTextOnFocus
                      key={idx}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.color.text.secondary,
                        borderRadius: 2,

                        width: 27,
                        height: 38,

                        textAlign: "center",

                        color: theme.color.text.primary,

                        fontWeight: 700,
                      }}
                      maxLength={1}
                      value={value}
                      cursorColor={theme.color.text.primary}
                      onChange={(e) => {}}
                      // onKeyPress={(e) => {}}
                      onChangeText={(text) =>
                        setValues((prev) => {
                          const newPrev = JSON.parse(JSON.stringify(prev));

                          newPrev[groupIdx][idx] = text;

                          return newPrev;
                        })
                      }
                    />
                  );
                })}
              </>
            );
          })}
        </View>
        <Button
          variant="primary"
          size="large"
          title="Join"
          // @ts-ignore
          onPress={() => navigation.navigate("index")}
        />
      </View>
      {/* <SmoothPinCodeInput
        cellStyle={{
          borderWidth: 2,
          borderRadius: 24,
          borderColor: "mediumturquoise",
          backgroundColor: "azure",
        }}
        cellStyleFocused={{
          borderColor: "lightseagreen",
          backgroundColor: "lightcyan",
        }}
        textStyle={{
          fontSize: 24,
          color: "salmon",
        }}
        textStyleFocused={{
          color: "crimson",
        }}
        value={code}
        onTextChange={setCode}
        //   onFulfill={this._checkCode}
        //   onBackspace={this._focusePrevInput}
        codeLength={9}
      /> */}
    </>
  );
}
