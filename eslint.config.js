// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const COPY_MESSAGE = "User-facing text belongs in src/lib/copy/en.ts. Import it from `copy`.";

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Keep user-facing text out of screens and components so it can be edited in one file.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    // Tests name things by their on-screen text, so literals are fine there.
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // <Text>Hello</Text>
        { selector: "JSXText[value=/\\S/]", message: COPY_MESSAGE },
        // <Text>{"Hello"}</Text>
        {
          selector: "JSXExpressionContainer > Literal[value=/[A-Za-z]/]",
          message: COPY_MESSAGE,
        },
        // <Button label="Hello" />
        {
          selector:
            "JSXAttribute[name.name=/^(accessibilityLabel|accessibilityHint|placeholder|title|label|alt)$/] > Literal",
          message: COPY_MESSAGE,
        },
        // options={{ title: "Hello" }}
        {
          selector:
            "Property[key.name=/^(title|headerTitle|tabBarLabel|accessibilityLabel|placeholder)$/] > Literal",
          message: COPY_MESSAGE,
        },
      ],
    },
  },
]);
