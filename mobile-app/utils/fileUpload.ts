import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

type ByteArray = Uint8Array;

export async function readAsByteArray(uri: string): Promise<ByteArray> {
    const file = new File(uri);
    return await file.bytes();
}

/** The picked images; empty when the user cancels. Callers compress before uploading. */
export async function launchImageLibrary(
    options?: ImagePicker.ImagePickerOptions
): Promise<ImagePicker.ImagePickerAsset[]> {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    return result.assets ?? [];
}
