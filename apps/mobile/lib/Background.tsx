import { Image } from 'expo-image';
import { Dimensions, View } from 'react-native';

import { useAssetQuery } from '@/api/calls/assetHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { useTheme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export const AppBackground: React.FC = () => {
    const { width, height } = Dimensions.get('window');

    const { group } = useGroup();

    const settings = useLocalSettings();

    const theme = useTheme();

    const wallpaperQuery = useAssetQuery(group?.data?.assetIdWallpaper);

    const customWallpaperUrl = wallpaperQuery.data?.data?.url;

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
                // Window-sized and mounted on many screens: every mount drew its own shrunk copy
                // of an uploaded wallpaper on the main thread, which hangs when it's large
                // (MOBILE-P). Uploads are at most 2000 px (compressImage), so keeping the one
                // full image is fine; the bundled theme image is far larger and stays downscaled.
                allowDownscaling={!customWallpaperSource}
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
