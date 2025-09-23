import MenuItem, { MenuItemProps } from '@/components/Menu/MenuItem';
import MenuSection, { MenuSectionProps } from '@/components/Menu/MenuSection';

export interface SelectOption
    extends Omit<MenuItemProps, 'onPress' | 'tailIconType'> {
    value: string;
}

export interface SelectProps extends Omit<MenuSectionProps, 'children'> {
    value?: string | null;

    onChange: (value: string) => void;

    items: SelectOption[];
}
export default function Select({
    value,
    onChange,
    items,
    ...rest
}: SelectProps) {
    return (
        <MenuSection {...rest}>
            {items.map((i, idx) => {
                const checked = value === i.value;

                return (
                    <MenuItem
                        border={idx !== 0}
                        key={idx}
                        tailIconType={
                            value == null
                                ? undefined
                                : checked
                                  ? 'checked'
                                  : 'unchecked'
                        }
                        onPress={() => {
                            if (i.value !== value) {
                                onChange(i.value);
                            }
                        }}
                        {...i}
                    />
                );
            })}
        </MenuSection>
    );
}
