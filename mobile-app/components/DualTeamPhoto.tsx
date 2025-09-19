import { useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

import { Match } from '@/api/utils/matchDtoToMatch';
import { ScoreChip, Team } from '@/components/MatchVsHeader';
import PressableScale from '@/components/PressableScale';
import { useTheme } from '@/theme';

export function DualTeamPhoto({
    match,
    blueImageSource,
    redImageSource,
    blueLarge = false,
}: {
    match: Pick<Match, 'blueTeam' | 'redTeam'>;
    blueImageSource?: ImageSourcePropType;
    redImageSource?: ImageSourcePropType;
    blueLarge?: boolean;
}) {
    const [areEqualSize, setAreEqualSize] = useState(blueLarge ? false : true);

    const [primary, setPrimary] = useState<'red' | 'blue'>('blue');

    const secondary = primary === 'blue' ? 'red' : 'blue';

    function switchPrimary(team: 'red' | 'blue') {
        if (areEqualSize) {
            setAreEqualSize(false);
            setPrimary(team);
        } else {
            setPrimary(primary === 'blue' ? 'red' : 'blue');
        }
    }
    const theme = useTheme();

    const aspectRatio = 4 / 3;

    const smallHeight = 196;
    const largeHeight = 16 * 32;

    const smallSize = { width: smallHeight / aspectRatio, height: smallHeight };

    return (
        <View
            style={{
                flexDirection: areEqualSize ? 'row' : undefined,
                alignItems: areEqualSize ? 'center' : undefined,
                justifyContent: 'space-between',
                position: 'relative',

                height: areEqualSize ? smallHeight : largeHeight,
            }}
        >
            <PressableScale
                onLongPress={() => setAreEqualSize(true)}
                onPress={() => switchPrimary(primary)}
                style={[
                    {
                        alignItems: 'center',
                        justifyContent: 'center',

                        borderRadius: 18,

                        borderColor: theme.color.team[primary],
                        borderWidth: 2,

                        height: '100%',

                        overflow: 'hidden',
                    },
                    areEqualSize && smallSize,
                ]}
            >
                <Team
                    style={{ opacity: 0.7 }}
                    size={areEqualSize ? undefined : 54}
                    centered
                    players={
                        primary === 'blue' ? match.blueTeam : match.redTeam
                    }
                    color={primary}
                />
                <Image
                    source={
                        primary === 'blue' ? blueImageSource : redImageSource
                    }
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
            </PressableScale>
            {areEqualSize && <ScoreChip />}
            <PressableScale
                onLongPress={() => setAreEqualSize(true)}
                onPress={() => switchPrimary(secondary)}
                pressableStyle={
                    areEqualSize
                        ? undefined
                        : {
                              position: 'absolute',
                              top: 14,
                              left: 14,
                          }
                }
                style={[
                    {
                        alignItems: 'center',
                        justifyContent: 'center',

                        borderRadius: 18,

                        borderColor: theme.color.team[secondary],
                        borderWidth: 2,

                        overflow: 'hidden',
                    },
                    smallSize,
                ]}
            >
                <Team
                    style={{ opacity: 0.7 }}
                    centered
                    players={
                        secondary === 'blue' ? match.blueTeam : match.redTeam
                    }
                    color={secondary}
                />
                <Image
                    source={
                        secondary === 'blue' ? blueImageSource : redImageSource
                    }
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
            </PressableScale>
        </View>
    );
}
