import { ScrollView } from 'react-native';

import { AllowedMoves, AllowedMovesProps } from '@/components/AllowedMoves';
import InputModal from '@/components/InputModal';
import Text from '@/components/Text';

export const NewSeasonRulesInput: React.FC<AllowedMovesProps> = (props) => {
    return (
        <InputModal isDark>
            <ScrollView>
                <Text
                    color="secondary"
                    style={{
                        marginTop: 16,
                    }}
                >
                    Now is the time to change the rules for the new leaderboard.
                    You won't be able to change these again without starting a
                    new season.
                </Text>
                <AllowedMoves {...props} />
            </ScrollView>
        </InputModal>
    );
};
