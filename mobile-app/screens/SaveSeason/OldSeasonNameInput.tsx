import { ScrollView } from 'react-native';

import { Player } from '@/api/propHooks/leaderboardPropHooks';
import InputModal from '@/components/InputModal';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';

export const OldSeasonNameInput: React.FC<{
    numMatches: number;
    numPlayers: number;
    startDate: string;
    rankedPlayers: Player[];

    onChangeName: (name: string) => void;
}> = ({ numMatches, numPlayers, startDate, rankedPlayers, onChangeName }) => {
    return (
        <ScrollView>
            <InputModal isDark>
                <LeaderBoardSeasonInfo
                    isCurrentSeason
                    numMatches={numMatches}
                    numPlayers={numPlayers}
                    startDate={startDate}
                    endDate={new Date().toString()}
                />
                <Podium
                    detailed={false}
                    style={{ marginHorizontal: 'auto' }}
                    firstPlace={rankedPlayers[0]}
                    secondPlace={rankedPlayers[1]}
                    thirdPlace={rankedPlayers[2]}
                />
                <TextInput
                    required
                    placeholder="Season Name"
                    onChangeText={onChangeName}
                    autoFocus
                    style={{
                        alignSelf: 'stretch',
                    }}
                />
            </InputModal>
        </ScrollView>
    );
};
