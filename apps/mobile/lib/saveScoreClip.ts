import { File, Paths } from 'expo-file-system';
import { Linking, Platform, Share } from 'react-native';

/**
 * Lets a player keep their score clip: iOS downloads it and opens the share sheet ("Save Video"
 * puts it in Photos); Android opens it in the browser, which can download it (React Native's share
 * sheet only shares text there).
 */
export async function saveScoreClip(url: string, name: string) {
    if (Platform.OS !== 'ios') {
        await Linking.openURL(url);
        return;
    }
    const safeName = name.replace(/[^\p{L}\p{N}_-]+/gu, '-') || 'player';
    const file = new File(Paths.cache, `${safeName}-score-clip.mp4`);
    if (file.exists) file.delete();
    const downloaded = await File.downloadFileAsync(url, file);
    await Share.share({ url: downloaded.uri });
}
