import { View } from 'react-native';

import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import IconHead from '@/components/IconHead';

export const NoMatchesPlayedYet: React.FC = () => {
    const nav = useNavigation();
    return (
        <View style={{ paddingTop: 64 }}>
            <IconHead
                iconName="format-list-bulleted"
                title="No Matches Played"
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
