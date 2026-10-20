import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { Snackbar } from "@/components/Snackbar";
import { useUserLocation } from "@/features/map/useUserLocation";
import { SavedView } from "@/features/saved/SavedView";
import type { SavedCafe } from "@/features/saved/types";
import { useSavedCafes, useSetSaved } from "@/features/saved/useSavedCafes";
import { copy } from "@/lib/copy/en";

type Removed = { cafe: SavedCafe; index: number };

export default function SavedScreen() {
  const saved = useSavedCafes();
  const user = useUserLocation();
  const setSaved = useSetSaved(() => Alert.alert(copy.cafe.saveFailed));
  const [removed, setRemoved] = useState<Removed | null>(null);
  const dismiss = useCallback(() => setRemoved(null), []);

  return (
    <Screen noBottomInset>
      <SavedView
        cafes={saved.data}
        failed={saved.isError}
        position={user.position}
        onRetry={() => void saved.refetch()}
        onOpen={(cafe) => router.push({ pathname: "/cafe/[id]", params: { id: cafe.id } })}
        onUnsave={(cafe, index) => {
          setSaved.mutate({ cafe, save: false, index });
          setRemoved({ cafe, index });
        }}
        onFindCafes={() => router.navigate("/map")}
      />
      {removed ? (
        <Snackbar
          message={copy.saved.removed(removed.cafe.name)}
          actionLabel={copy.saved.undo}
          onAction={() => {
            setSaved.mutate({ ...removed, save: true });
            setRemoved(null);
          }}
          onDismiss={dismiss}
        />
      ) : null}
    </Screen>
  );
}
