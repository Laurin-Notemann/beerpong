import { Image } from 'expo-image';
import { Dimensions, View } from 'react-native';

import { useGroup } from '@/api/calls/seasonHooks';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';
import {getAssetUrl} from "@/api/utils/assetUrl";

export const AppBackground: React.FC = () => {
    const { width, height } = Dimensions.get('window');

    const { group } = useGroup();

    const settings = useLocalSettings();

    const theme = useTheme();

    const customWallpaperUrl = getAssetUrl(group?.data?.assetIdWallpaper);

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

                backgroundColor: theme.color.bg,
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
                cachePolicy="memory-disk"
                transition={100} // fade in
            />
            <View
                style={{
                    position: 'absolute',
                    width,
                    height,
                    backgroundColor: '#000',
                    // opacity: 0.1,
                    opacity: 0,
                }}
            />
        </View>
    );
};
