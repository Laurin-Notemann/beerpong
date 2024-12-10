import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { triggerHapticBump } from '@/haptics';
import { theme } from '@/theme';

import Text from './Text';

export interface StepperProps {
    value: number;
    onChange?: (value: number) => void;

    min?: number;
    max?: number;
}
export default function Stepper({ value, onChange, min, max }: StepperProps) {
    const minDisabled = min != null && value <= min;
    const maxDisabled = max != null && value >= max;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                disabled={minDisabled}
                style={[styles.button, { opacity: minDisabled ? 0.2 : 1 }]}
                onPress={() => {
                    triggerHapticBump('selection');
                    onChange?.(value - 1);
                }}
            >
                <Icon
                    color={theme.color.text.secondary}
                    size={24}
                    name="minus"
                />
            </TouchableOpacity>

            <Text variant="body1" color="primary">
                {value}
            </Text>
            <TouchableOpacity
                disabled={maxDisabled}
                style={[styles.button, { opacity: maxDisabled ? 0.2 : 1 }]}
                onPress={() => {
                    triggerHapticBump('selection');
                    onChange?.(value + 1);
                }}
            >
                <Icon
                    color={theme.color.text.secondary}
                    size={24}
                    name="plus"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',

        gap: 4,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',

        width: 44,
        height: 44,
    },
});
