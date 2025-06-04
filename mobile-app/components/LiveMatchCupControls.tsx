import React, { useMemo } from 'react';
import { StyleSheet, TouchableHighlight, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import { useTheme } from '@/theme';

export interface LiveMatchCupControlsProps {
    onFlip: () => void;
}
export default function LiveMatchCupControls({
    onFlip,
}: LiveMatchCupControlsProps) {
    const nav = useNavigation();

    const theme = useTheme();

    const insets = useInsets(true, true);

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    zIndex: 1,
                    position: 'absolute',
                    overflow: 'hidden',

                    right: 16,
                    bottom: insets.bottom + 16,

                    borderRadius: 10,
                    backgroundColor: theme.panel.light.bg,
                },
                button: {
                    alignItems: 'center',
                    justifyContent: 'center',

                    width: 50,
                    height: 50,

                    borderTopWidth: 0.5,
                    borderTopColor: theme.panel.light.dividers,
                },
                dot: {
                    position: 'absolute',
                    width: 8,
                    height: 8,

                    right: 13,
                    bottom: 13,

                    borderRadius: 4,
                },
            }),
        [theme, insets]
    );

    return (
        <View style={styles.container}>
            {/* <Link
        href={{
          pathname: "/formations",
          params: { color: "red" },
        }}
        style={{ width: 50, height: 50 }}
      > */}
            <TouchableHighlight
                style={styles.button}
                underlayColor={theme.panel.light.active}
                onPress={() => nav.navigate('formations')}
            >
                <>
                    <Icon
                        name="arrow-collapse"
                        size={24}
                        color={theme.color.text.primary}
                    />
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: theme.color.team.red },
                        ]}
                    />
                </>
            </TouchableHighlight>
            {/* </Link> */}
            <TouchableHighlight
                style={styles.button}
                underlayColor={theme.panel.light.active}
                onPress={onFlip}
            >
                <Icon
                    name="swap-vertical"
                    size={24}
                    color={theme.color.text.primary}
                />
            </TouchableHighlight>
            {/* <Link
        href={{
          pathname: "/formations",
          params: { color: "blue" },
        }}
        style={{ width: 50, height: 50 }}
      > */}
            <TouchableHighlight
                style={styles.button}
                underlayColor={theme.panel.light.active}
                onPress={() => nav.navigate('formations')}
            >
                <>
                    <Icon
                        name="arrow-collapse"
                        size={24}
                        color={theme.color.text.primary}
                    />
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: theme.color.team.blue },
                        ]}
                    />
                </>
            </TouchableHighlight>
            {/* </Link> */}
        </View>
    );
}
