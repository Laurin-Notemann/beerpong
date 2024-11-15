import { useState } from "react";
import { launchImageLibrary } from "react-native-image-picker";

import InputModal from "@/components/InputModal";
import TextInput from "@/components/TextInput";
import Avatar from "@/components/Avatar";

export default function Page() {
  const [value, setValue] = useState("");

  return (
    <InputModal>
      <Avatar
        name={value}
        size={96}
        canUpload
        onPress={async () => {
          const result = await launchImageLibrary({ mediaType: "photo" });

          console.log(result);
        }}
      />
      <TextInput
        required
        placeholder="Player Name"
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
