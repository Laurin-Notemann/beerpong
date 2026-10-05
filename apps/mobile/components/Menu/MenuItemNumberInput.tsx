import React, { forwardRef, useRef } from 'react';
import { TextInput as ReactNativeTextInput } from 'react-native';
import type { TextInputInstance } from 'react-native';

import MenuItem, { MenuItemProps } from '@/components/Menu/MenuItem';
import { useTheme } from '@/theme';

const NumberInput = forwardRef<
    TextInputInstance,
    {
        defaultValue: number;
        onChange: (value: number) => void;
        decimal?: boolean;
    }
>(({ defaultValue, onChange, decimal }, ref) => {
    function selectEverything() {
        setTimeout(() => {
            if (!ref || typeof ref === 'function') {
                throw new Error('NumberInput expected a useRef');
            }
            ref.current?.setSelection(0, defaultValue.toString().length);
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
            keyboardType={decimal ? 'decimal-pad' : 'numeric'}
            onChangeText={(text) => {
                // some keyboards type a decimal comma
                const value = decimal
                    ? parseFloat(text.replace(',', '.'))
                    : parseInt(text);
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
        decimal?: boolean;
    }
> = ({ defaultValue = 0, onChange, decimal, ...props }) => {
    const ref = useRef<TextInputInstance>(null);

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
                    decimal={decimal}
                />
            }
        />
    );
};
