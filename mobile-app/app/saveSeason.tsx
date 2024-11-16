import InputModal from '@/components/InputModal';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';

export default function Page() {
    async function startNewSeason(oldSeasonName: string) {}

    return (
        <InputModal>
            <Podium detailed={false} />
            <TextInput
                required
                placeholder="Season Name"
                onSubmitEditing={(event) => {
                    startNewSeason(event.nativeEvent.text);
                }}
                autoFocus
                style={{
                    alignSelf: 'stretch',
                }}
            />
        </InputModal>
    );
}
