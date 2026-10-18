import { Redirect } from "expo-router";
import { useStage } from "@/features/auth/useStage";
import { stageHref } from "@/features/auth/stageHref";

/** The entry point: sends each person to the screen their stage starts on. */
export default function Index() {
  const href = stageHref(useStage());
  return href ? <Redirect href={href} /> : null;
}
