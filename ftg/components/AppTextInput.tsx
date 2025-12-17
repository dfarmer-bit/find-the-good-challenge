import { Colors, Radius } from "@/constants/theme";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

export function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      autoCorrect
      spellCheck
      textContentType="none"
      keyboardAppearance="dark"
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
  },
});
