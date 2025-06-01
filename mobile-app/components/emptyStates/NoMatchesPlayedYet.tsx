import { View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import IconHead from '@/components/IconHead';

export const NoMatchesPlayedYet: React.FC<{ message?: string }> = ({
    message = 'No Matches Played',
}) => {
    const nav = useNavigation();
    return (
        <View style={{ paddingTop: 64 }}>
            <IconHead
                iconName="format-list-bulleted"
                title={message}
                description={
                    <Button
                        style={{
                            marginTop: 24,
                        }}
                        onPress={() => nav.navigate('newMatch')}
                        title="Create match"
                        variant="primary"
                    />
                }
            />
        </View>
    );
};
