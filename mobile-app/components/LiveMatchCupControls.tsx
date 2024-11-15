import { useNavigation } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableHighlight, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { theme } from '@/theme';

const styles = StyleSheet.create({
    container: {
        zIndex: 1,
        position: 'absolute',
        overflow: 'hidden',

        right: 16,
        bottom: 16,

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
});

export interface LiveMatchCupControlsProps {
    onFlip: () => void;
}
export default function LiveMatchCupControls({
    onFlip,
}: LiveMatchCupControlsProps) {
    const nav = useNavigation();

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
                // @ts-ignore
                onPress={() => nav.navigate('formations')}
            >
                <>
                    <Icon name="arrow-collapse" size={24} color="#fff" />
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
                <Icon name="swap-vertical" size={24} color="#fff" />
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
                // @ts-ignore
                onPress={() => nav.navigate('formations')}
            >
                <>
                    <Icon name="arrow-collapse" size={24} color="#fff" />
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
