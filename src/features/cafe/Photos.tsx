import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { CircleButton } from "@/components/CircleButton";
import { MetricIcon } from "@/components/MetricIcon";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { CafePhoto } from "./types";
import { useSignedPhotoUrl } from "./usePhotos";

type SignedImageProps = {
  path: string;
  fit?: "cover" | "contain";
  style?: object;
};

/** A private photo, shown through a short-lived signed link. */
export function SignedImage({ path, fit = "cover", style }: SignedImageProps) {
  const { colors } = useTheme();
  const url = useSignedPhotoUrl(path);
  return (
    <View style={[{ backgroundColor: colors.border, overflow: "hidden" }, style]}>
      {url.data ? (
        <Image
          source={{ uri: url.data }}
          contentFit={fit}
          style={{ width: "100%", height: "100%" }}
          transition={150}
        />
      ) : url.isError ? null : (
        <ActivityIndicator style={{ flex: 1 }} />
      )}
    </View>
  );
}

const GRID_HEIGHT = 200;

type GridProps = { photos: readonly CafePhoto[]; onOpen: (index: number) => void };

/** The newest photo large on the left, the next two stacked on the right. A placeholder when none. */
export function PhotoGrid({ photos, onOpen }: GridProps) {
  const { metrics } = useTheme();
  if (photos.length === 0) {
    return (
      <View
        style={{
          height: GRID_HEIGHT,
          borderRadius: radius.lg,
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          backgroundColor: metrics.coffee.tint,
        }}
      >
        <MetricIcon icon="cup" size={40} color={metrics.coffee.onTint} />
        <Text variant="label" color={metrics.coffee.onTint}>
          {copy.cafe.photoPlaceholder}
        </Text>
      </View>
    );
  }

  const [first, ...rest] = photos;
  const side = rest.slice(0, 2);
  const tile = (photo: CafePhoto, index: number) => (
    <Pressable
      key={photo.path}
      accessibilityRole="imagebutton"
      accessibilityLabel={copy.cafe.photoLabel(index + 1, photos.length)}
      onPress={() => onOpen(index)}
      style={{ flex: 1 }}
    >
      {/* The big cover tile uses the full image. The small ones use the thumbnail. */}
      <SignedImage
        path={index === 0 ? photo.path : (photo.thumb_path ?? photo.path)}
        style={{ flex: 1, borderRadius: radius.md }}
      />
    </Pressable>
  );

  return (
    <View style={{ height: GRID_HEIGHT, flexDirection: "row", gap: spacing.sm }}>
      <View style={{ flex: side.length > 0 ? 2 : 1 }}>{tile(first, 0)}</View>
      {side.length > 0 ? (
        <View style={{ flex: 1, gap: spacing.sm }}>
          {side.map((photo, i) => tile(photo, i + 1))}
        </View>
      ) : null}
    </View>
  );
}

/** Full screen, on black. Swipe between photos; tap a photo or the close button to leave. */
export function PhotoViewer({
  paths,
  startIndex,
  onClose,
}: {
  paths: readonly string[];
  startIndex: number;
  onClose: () => void;
}) {
  const visible = paths.length > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Mounted only while open, so each opening starts on the photo that was tapped. */}
      {visible ? <ViewerPages paths={paths} startIndex={startIndex} onClose={onClose} /> : null}
    </Modal>
  );
}

function ViewerPages({
  paths,
  startIndex,
  onClose,
}: {
  paths: readonly string[];
  startIndex: number;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const first = Math.min(startIndex, paths.length - 1);
  const [index, setIndex] = useState(first);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
      <FlatList
        data={paths}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(path) => path}
        initialScrollIndex={first}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.cafe.closePhoto}
            onPress={onClose}
            style={{ width, justifyContent: "center" }}
          >
            <SignedImage path={item} fit="contain" style={{ flex: 1 }} />
          </Pressable>
        )}
      />
      <View style={{ position: "absolute", top: spacing.xxl + spacing.lg, right: spacing.lg }}>
        <CircleButton icon="close" accessibilityLabel={copy.cafe.closePhoto} onPress={onClose} />
      </View>
      {paths.length > 1 ? (
        <View
          style={{
            position: "absolute",
            bottom: spacing.xxl,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text variant="label" color="#fff">
            {copy.cafe.photoPosition(index + 1, paths.length)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
