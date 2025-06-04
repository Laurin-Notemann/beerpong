import { ScrollView } from 'react-native';

import { useInsets } from '@/app/useInsets';
import { AllowedMoves, AllowedMovesProps } from '@/components/AllowedMoves';
import InputModal from '@/components/InputModal';
import Text from '@/components/Text';

export const NewSeasonRulesInput: React.FC<AllowedMovesProps> = (props) => {
    const insets = useInsets(true);
    return (
        <InputModal isDark>
            <ScrollView
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: 32,
                }}
            >
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
