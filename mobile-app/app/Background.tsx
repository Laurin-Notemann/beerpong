import { Dimensions, Image, View } from 'react-native';

import { useTheme } from '@/theme';

const { width, height } = Dimensions.get('window');

export const AppBackground: React.FC<{}> = () => {
    const theme = useTheme();

    if (!theme.bg.url) {
        return (
            <View
                style={{
                    position: 'absolute',
                    width,
                    height,
                    backgroundColor: theme.color.bg,
                }}
            />
        );
    }

    return (
        <Image
            source={theme.bg.url}
            style={{
                position: 'absolute',
                width,
                height,
                resizeMode: 'cover',

                backgroundColor: theme.color.bg,
            }}
        />
    );
};
