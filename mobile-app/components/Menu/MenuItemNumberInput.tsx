import React, { forwardRef, useRef } from 'react';
import { TextInput as ReactNativeTextInput } from 'react-native';

import MenuItem, { MenuItemProps } from '@/components/Menu/MenuItem';
import { useTheme } from '@/theme';

const NumberInput = forwardRef<
    ReactNativeTextInput,
    {
        defaultValue: number;
        onChange: (value: number) => void;
    }
>(({ defaultValue, onChange }, ref) => {
    function selectEverything() {
        setTimeout(() => {
            if (!ref || typeof ref === 'function') {
                throw new Error('NumberInput expected a useRef');
            }
            ref.current?.setNativeProps({
                selection: {
                    start: 0,
                    end: defaultValue.toString().length,
                },
            });
        }, 0);
    }
    const theme = useTheme();

    return (
        <ReactNativeTextInput
            keyboardAppearance={theme.keyboardAppearance}
            ref={ref}
            style={{
                color: theme.color.text.secondary,

                fontSize: 17,
                lineHeight: 22,
                fontWeight: 400,

                textAlign: 'right',

                width: 16 * 3.5,
            }}
            cursorColor={theme.color.text.primary}
            placeholderTextColor={theme.icon.secondary}
            selectionColor={theme.color.text.primary}
            placeholder={defaultValue.toString()}
            defaultValue={defaultValue.toString()}
            keyboardType="numeric"
            onChangeText={(text) => {
                const value = parseInt(text);
                if (!isNaN(value)) {
                    onChange(value);
                }
            }}
            onFocus={selectEverything}
        />
    );
});
NumberInput.displayName = 'NumberInput';

export const MenuItemNumberInput: React.FC<
    Omit<
        MenuItemProps,
        'tailContent' | 'onChange' | 'defaultValue' | 'value'
    > & {
        defaultValue?: number;
        onChange: (value: number) => void;
    }
> = ({ defaultValue = 0, onChange, ...props }) => {
    const ref = useRef<ReactNativeTextInput>(null);

    return (
        <MenuItem
            tailIconType="next"
            {...props}
            onPress={() => ref.current?.focus()}
            tailContent={
                <NumberInput
                    ref={ref}
                    defaultValue={defaultValue}
                    onChange={onChange}
                />
            }
        />
    );
};
