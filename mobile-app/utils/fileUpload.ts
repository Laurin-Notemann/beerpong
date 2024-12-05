import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

type ByteArray = Uint8Array<ArrayBuffer>;

type ByteArrayImagePickerAsset = ImagePicker.ImagePickerAsset & {
    byteArray: ByteArray;
};

export const base64ToByteArray = (base64: string): ByteArray => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export async function readAsByteArray(fileUri: string): Promise<ByteArray> {
    const base64Uri = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const byteArray = base64ToByteArray(base64Uri);

    return byteArray;
}

export async function launchImageLibrary(
    options?: ImagePicker.ImagePickerOptions
): Promise<ByteArrayImagePickerAsset[]> {
    // important: this promise never resolves if the image picker modal is dismissed by swiping
    // see https://github.com/expo/expo/issues/15185
    // this might have been fixed in a later version of expo-image-picker, but later versions are incompatible with our project :)
    const result = await ImagePicker.launchImageLibraryAsync(options);

    const assets = await Promise.all<ByteArrayImagePickerAsset>(
        result.assets?.map<Promise<ByteArrayImagePickerAsset>>(
            async (asset) => {
                const byteArray = await readAsByteArray(asset.uri);

                const newAsset = asset as ByteArrayImagePickerAsset;

                newAsset.byteArray = byteArray;

                return newAsset;
            }
        ) ?? []
    );
    return assets;
}
