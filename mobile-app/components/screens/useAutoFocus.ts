import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

/**
 * no matter what i tried, i couldn't get `<TextInput autoFocus>` to work on `createGroup` or `joinGroup`.
 * on navigation there, it would initially focus the input and open the keyboard, but then quickly dismiss it again.
 * this happens even for a minified example of just returning the textinput and nothing else.
 * might be caused by the way we do navigation or something idk
 *
 * TODO: this solution is not ideal, because it's overengineered and takes longer for the keyboard to show up than the `autoFocus` property.
 */
export function useAutoFocus(inputRef: React.RefObject<any>) {
    const navigation = useNavigation();

    useEffect(() => {
        // @ts-expect-error it says transitionEnd is not usable here but i mean it works lol
        const unsubscribe = navigation.addListener('transitionEnd', () => {
            inputRef.current?.focus();
        });
        return unsubscribe;
    }, [navigation]);
}
