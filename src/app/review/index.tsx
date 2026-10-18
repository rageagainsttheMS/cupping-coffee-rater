import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Placeholder } from "@/components/Placeholder";
import { copy } from "@/lib/copy/en";

export default function ReviewScreen() {
  return (
    <Placeholder title={copy.screens.review} milestone="M7">
      <Button label={copy.common.close} variant="secondary" onPress={() => router.back()} />
    </Placeholder>
  );
}
