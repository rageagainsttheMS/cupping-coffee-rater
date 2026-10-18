import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/components/Placeholder";
import { copy } from "@/lib/copy/en";

export default function CafeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Placeholder title={copy.screens.cafe(id)} milestone="M6" />;
}
