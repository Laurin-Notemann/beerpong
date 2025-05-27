import dayjs from 'dayjs';
import { Text, View } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import MatchVsHeader from '@/components/MatchVsHeader';
import { useTheme } from '@/theme';

export const MatchesListItem: React.FC<{
    match: Match;
    onPress: () => void;
}> = ({ match, onPress }) => {
    const theme = useTheme();

    return (
        <TouchableHighlight
            underlayColor={theme.panel.light.active}
            style={{
                backgroundColor: theme.panel.light.bg,
                gap: 4,
                paddingHorizontal: 16,
                paddingVertical: 7,

                borderTopColor: theme.panel.light.active,
                borderTopWidth: 0.5,
            }}
            onPress={onPress}
        >
            <>
                <MatchVsHeader match={match} />
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            color: theme.color.text.tertiary,
                        }}
                    >
                        {env.format.date.matchHour(dayjs(match.date))}
                    </Text>
                    <Text
                        style={{
                            fontSize: 15,
                            color: theme.color.text.tertiary,

                            flex: 1,
                        }}
                    >
                        {match.blueTeam.map((i) => i.name).join(', ') +
                            ' - ' +
                            match.redTeam.map((i) => i.name).join(', ')}
                    </Text>
                </View>
            </>
        </TouchableHighlight>
    );
};
