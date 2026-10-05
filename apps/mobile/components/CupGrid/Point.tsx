import { View } from 'react-native';

export default function Point({
    size,
    x,
    y,
}: {
    size: number;
    x: number;
    y: number;
}) {
    return (
        <View
            style={{
                position: 'absolute',

                backgroundColor: '#151515',

                width: size,
                height: size,
                borderRadius: size / 2,

                top: y - size / 2,
                left: x - size / 2,
            }}
        />
    );
}
