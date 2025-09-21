import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

type ByteArray = Uint8Array;

export async function readAsByteArray(uri: string): Promise<ByteArray> {
    const file = new File(uri);
    return await file.bytes();
}

export type ByteArrayImagePickerAsset = ImagePicker.ImagePickerAsset & {
    byteArray: ByteArray;
};

export async function launchImageLibrary(
    options?: ImagePicker.ImagePickerOptions
): Promise<ByteArrayImagePickerAsset[]> {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    const assets = await Promise.all(
        (result.assets ?? []).map(async (asset) => {
            const byteArray = await readAsByteArray(asset.uri);

            return { ...asset, byteArray } as ByteArrayImagePickerAsset;
        })
    );
    return assets;
}
