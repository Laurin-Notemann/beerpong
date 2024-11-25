import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { theme } from '@/theme';

import { HeaderItem } from './HeaderItem';

export default function ModalDragHandle({
    onBackPress,
    onNextPress,
}: {
    onBackPress?: () => void;
    onNextPress?: () => void;
}) {
    return (
        <View
            style={{
                position: 'relative',

                width: '100%',
                height: 48,
            }}
        >
            <View
                style={{
                    position: 'absolute',

                    width: '100%',
                    height: '100%',

                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View
                    style={{
                        borderRadius: 99,

                        backgroundColor: theme.panel.light.border,

                        width: 80,
                        height: 8,
                    }}
                />
            </View>
            <View
                style={{
                    position: 'absolute',

                    width: '100%',
                    height: '100%',

                    flexDirection: 'row',
                    alignItems: 'center',

                    paddingTop: 16,
                }}
            >
                {onBackPress && (
                    <HeaderItem
                        onPress={onBackPress}
                        style={{
                            marginRight: 'auto',
                        }}
                    >
                        <Icon name="chevron-left" size={32} />
                    </HeaderItem>
                )}
                {onNextPress && (
                    <HeaderItem
                        onPress={onNextPress}
                        style={{
                            marginLeft: 'auto',
                        }}
                    >
                        <Icon name="chevron-right" size={32} />
                    </HeaderItem>
                )}
            </View>
        </View>
    );
}
