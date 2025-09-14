import { Dimensions, Image, View } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export const AppBackground: React.FC = () => {
    const { width, height } = Dimensions.get('window');

    const { group } = useGroup();

    const settings = useLocalSettings();

    const theme = useTheme();

    const customWallpaperUrl = group.data?.wallpaperAsset?.url;

    const customWallpaperSource = customWallpaperUrl
        ? { uri: customWallpaperUrl }
        : null;

    const wallpaperSource = customWallpaperSource || theme.bg.url;

    if (!wallpaperSource || !settings.showWallpaper) {
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
        <View
            style={{
                position: 'absolute',
                width,
                height,
            }}
        >
            <Image
                source={wallpaperSource}
                style={{
                    position: 'absolute',
                    width,
                    height,
                    resizeMode: 'cover',

                    backgroundColor: theme.color.bg,
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    width,
                    height,
                    backgroundColor: '#000',
                    opacity: 0.2,
                }}
            />
        </View>
    );
};
