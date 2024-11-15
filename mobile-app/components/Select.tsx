import MenuItem, { MenuItemProps } from "./Menu/MenuItem";
import MenuSection, { MenuSectionProps } from "./Menu/MenuSection";

export interface SelectOption
  extends Omit<MenuItemProps, "onPress" | "tailIconType"> {
  value: string;
}

export interface SelectProps extends Omit<MenuSectionProps, "children"> {
  value: string;

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
      {items.map((i) => {
        const checked = value === i.value;

        return (
          <MenuItem
            tailIconType={checked ? "checked" : "unchecked"}
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
