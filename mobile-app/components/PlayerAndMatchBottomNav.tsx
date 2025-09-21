import { BlurView } from 'expo-blur';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/theme';

export function PlayerAndMatchBottomNav({
    hasNextAndPrevButtons,
    onNextPress,
    onPrevPress,
}: {
    hasNextAndPrevButtons: boolean;
    onNextPress?: () => void;
    onPrevPress?: () => void;
}) {
    const theme = useTheme();
    return (
        <View>
            <BlurView
                intensity={theme.blur?.intensity || 50}
                tint={theme.blur?.tint}
                style={StyleSheet.absoluteFill}
            />

            <View
                style={{
                    width: '100%',

                    height: 48 + 35,

                    paddingTop: 8,
                }}
            >
                {hasNextAndPrevButtons && (
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 8,

                            justifyContent: 'center',
                        }}
                    >
                        <TouchableOpacity
                            disabled={!onPrevPress}
                            onPress={onPrevPress}
                        >
                            <Icon
                                name="chevron-left"
                                size={32}
                                color={theme.color.text.secondary}
                            />
                        </TouchableOpacity>
                        {/* <Text color="secondary" variant="h3">
                                    {name || 'Unknown'}
                                </Text> */}

                        <TouchableOpacity
                            disabled={!onNextPress}
                            onPress={onNextPress}
                        >
                            <Icon
                                name="chevron-right"
                                size={32}
                                color={theme.color.text.secondary}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
