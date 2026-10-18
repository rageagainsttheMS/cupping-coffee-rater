import { openLegal } from "@/lib/links";
import { copy } from "@/lib/copy/en";
import { Checkbox } from "./Checkbox";
import { LinkText } from "./LinkText";
import { Text } from "./Text";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
};

/** "I agree to the Terms of Use and Privacy Policy", with both as links. */
export function TermsCheckbox({ checked, onChange, invalid }: Props) {
  const text = copy.auth.signUp;
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      invalid={invalid}
      accessibilityLabel={`${text.agreePrefix}${text.terms}${text.and}${text.privacy}`}
    >
      <Text variant="label">
        {text.agreePrefix}
        <LinkText variant="label" onPress={() => openLegal("terms")}>
          {text.terms}
        </LinkText>
        {text.and}
        <LinkText variant="label" onPress={() => openLegal("privacy")}>
          {text.privacy}
        </LinkText>
      </Text>
    </Checkbox>
  );
}
