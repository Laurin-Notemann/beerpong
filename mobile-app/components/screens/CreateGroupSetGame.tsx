import { Stack } from 'expo-router';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    TouchableHighlight,
    View,
} from 'react-native';

import Text from '@/components/Text';
import { theme } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const paddingHorizontal = 16;
const gap = 12;
const numCols = 2;

export interface GameOption {
    id: string;
    title: string;

    icon: string; // currently unused, but we might want to use icons for disciplines e.g. in the group list in the sidebar?
    imageUrl: string;
}

export const CreateGroupSetGame: React.FC<{
    games: GameOption[];
    onSubmit: (game: GameOption) => void;
    isPending?: boolean;
}> = ({ games, onSubmit, isPending = false }) => {
    return (
        <ScrollView>
            <Stack.Screen
                options={{
                    headerRight: () =>
                        isPending ? <ActivityIndicator /> : undefined,

                    headerTitle: 'Create Group',
                    headerBackTitleVisible: false,
                    headerBackVisible: true,
                    headerTintColor: '#fff',

                    headerStyle: {
                        backgroundColor: '#000',
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                }}
            />
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',

                    paddingHorizontal,
                    gap,

                    paddingTop: 48,
                }}
            >
                <Text
                    color="secondary"
                    style={{ textAlign: 'center', marginBottom: 32 }}
                >
                    What game would you like to track in this group?
                </Text>
                {games.map((game) => (
                    <Item
                        key={game.id}
                        title={game.title}
                        imageUrl={game.imageUrl}
                        onPress={() => onSubmit(game)}
                    />
                ))}
                <Item title="Other" onPress={() => {}} />
            </View>
        </ScrollView>
    );
};

function Item({
    title,
    imageUrl,
    onPress,
}: {
    title: string;
    imageUrl?: string;
    onPress: () => void;
}) {
    const size = Math.floor(
        (SCREEN_WIDTH - paddingHorizontal * 2 - (gap * numCols - 1)) / numCols
    );

    return (
        <TouchableHighlight
            style={{
                alignItems: 'center',
                justifyContent: 'center',

                width: size,
                height: size,

                borderRadius: 16, // ios app icon would be size / 4.5 and gap would be size / 2

                backgroundColor: '#2E2E2E',

                overflow: 'hidden',
            }}
            underlayColor="#3B3B3B"
            onPress={onPress}
        >
            <>
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,

                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Image
                        source={{
                            uri: imageUrl,
                        }}
                        style={{
                            width: size,
                            height: size,
                            objectFit: 'cover',
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        }}
                    />
                </View>
                <Text
                    color="primary"
                    style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                    }}
                >
                    {title}
                </Text>
            </>
        </TouchableHighlight>
    );
}
