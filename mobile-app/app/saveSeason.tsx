import { useState } from "react";

import InputModal from "@/components/InputModal";
import TextInput from "@/components/TextInput";
import Podium from "@/components/Podium";

export default function Page() {
  const [value, setValue] = useState("");

  return (
    <InputModal>
      <Podium detailed={false} />
      <TextInput
        required
        placeholder="Season Name"
        value={value}
        onChangeText={setValue}
        autoFocus
        style={{
          alignSelf: "stretch",
        }}
      />
    </InputModal>
  );
}
