import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { ImageSourcePropType, Platform } from 'react-native';

import { ScopedLogger } from '@/utils/logging';

const logger = new ScopedLogger('toolbar-icon');

/**
 * Android's toolbar can't draw SF Symbols and needs an image; the app's icon font makes
 * one. Undefined until it's rendered (a frame or two).
 */
export function useAndroidIcon(
    name: keyof typeof MaterialCommunityIcons.glyphMap,
    color: string
) {
    const [icon, setIcon] = useState<ImageSourcePropType>();

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        let cancelled = false;
        MaterialCommunityIcons.getImageSource(name, 24, color)
            .then((source) => {
                if (!cancelled && source) setIcon(source);
            })
            .catch((err) => logger.error('failed to render toolbar icon', err));
        return () => {
            cancelled = true;
        };
    }, [name, color]);

    return icon;
}
