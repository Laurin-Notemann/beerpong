import { Text, View } from 'react-native';
import PaginationDot from 'react-native-insta-pagination-dots';

export interface SwiperHeaderProps {
    currentItemIdx: number;
    numItems: number;
}
export default function SwiperHeader({
    currentItemIdx,
    numItems,
}: SwiperHeaderProps) {
    const hasMultipleItems = numItems > 1;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'center',

                height: 20,
                paddingHorizontal: 16,
                paddingBottom: 8,
            }}
        >
            <Text
                style={{
                    fontSize: 10,
                    color: '#7E8893',

                    display: 'none',
                }}
            >
                {currentItemIdx + 1} / {numItems}
            </Text>
            <View
                style={{
                    alignItems: 'center',
                    flexGrow: 1,
                }}
            >
                {hasMultipleItems && (
                    <PaginationDot
                        activeDotColor={'#7E8893'}
                        curPage={currentItemIdx}
                        maxPage={numItems}
                    />
                )}
            </View>
            <Text
                style={{
                    fontSize: 10,
                    color: '#7E8893',
                }}
            >
                {currentItemIdx + 1} / {numItems}
            </Text>
        </View>
    );
}
