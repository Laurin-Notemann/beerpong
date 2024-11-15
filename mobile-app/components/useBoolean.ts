import { useState } from "react";

/**
 * `const [isModalShown, showModal, hideModal] = useBoolean();`
 */
export default function useBoolean(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  return [
    value,
    () => setValue(true),
    () => setValue(false),
    () => setValue((prev) => !prev),
    setValue,
  ] as const;
}
