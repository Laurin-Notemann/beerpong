import { router } from 'expo-router';
import { View } from 'react-native';

import Button from '@/components/Button';
import IconHead from '@/components/IconHead';

export const NoMatchesPlayedYet: React.FC<{ message?: string }> = ({
    message = 'No Matches Played',
}) => {
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
                        onPress={() => router.navigate('/newMatch')}
                        title="Create match"
                        variant="primary"
                    />
                }
            />
        </View>
    );
};
