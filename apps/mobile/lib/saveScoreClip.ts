import { Directory, File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

/**
 * Lets a player keep their score clip: iOS downloads it and opens the share sheet ("Save Video"
 * puts it in Photos); Android saves it into a folder the user picks (React Native's share sheet
 * only shares text there). Resolves with that folder's name, for the toast saying where it went.
 */
export async function saveScoreClip(
    url: string,
    name: string
): Promise<string | undefined> {
    const fileName = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '-') || 'player'}-score-clip.mp4`;

    // picked before downloading, so a cancel doesn't wait for the clip
    let folder: Directory | undefined;
    if (Platform.OS === 'android') {
        try {
            folder = await Directory.pickDirectoryAsync();
        } catch (err) {
            if ((err as { code?: string }).code === 'ERR_PICKER_CANCELLED') {
                return;
            }
            throw err;
        }
    }

    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    const downloaded = await File.downloadFileAsync(url, file);

    if (!folder) {
        await Share.share({ url: downloaded.uri });
        return;
    }
    // a name that's taken gets a number added
    await folder
        .createFile(fileName, 'video/mp4')
        .write(await downloaded.bytes());
    downloaded.delete();
    return folder.name;
}
