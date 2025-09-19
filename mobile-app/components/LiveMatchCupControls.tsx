import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
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

                    gap: 16,
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
            <OverlayIconButton
                iconName="arrow-collapse"
                onPress={() => nav.navigate('formations')}
                content={
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: theme.color.team.blue },
                        ]}
                    />
                }
            />
            <OverlayIconButton iconName="swap-vertical" onPress={onFlip} />
            <OverlayIconButton
                iconName="arrow-collapse"
                onPress={() => nav.navigate('formations')}
                content={
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: theme.color.team.red },
                        ]}
                    />
                }
            />
        </View>
    );
}
