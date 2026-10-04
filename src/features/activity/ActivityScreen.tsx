import { activityCopy as copy } from "@noirwire/shared/copy";
import {
  ACTIVITY_FILTERS,
  activityListView,
  type ActivityFilter,
} from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { useState } from "react";
import { ScrollView, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip, EmptyState, Text } from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { colors, layout } from "@/ui/theme";
import { useWalletSnapshot } from "../portfolio/useWalletSnapshot";
import { ActivityDetailSheet } from "./ActivityDetailSheet";
import { ActivityRow } from "./ActivityRow";

/** How many rows the list adds each time it reaches its end. */
export const ACTIVITY_PAGE = 50;

type ActivityScreenProps = {
  onOpenPortfolio: (id: string) => void;
  /** The clock the day headings are read against; the phone's own by default. */
  now?: () => number;
};

/** Spec 2.22: what has moved, newest first, from the log kept on this phone. */
export function ActivityScreen({ onOpenPortfolio, now = Date.now }: ActivityScreenProps) {
  const wallet = useWalletSnapshot();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [limit, setLimit] = useState(ACTIVITY_PAGE);
  const [opened, setOpened] = useState<string | null>(null);

  if (!wallet) return <SafeAreaView style={styles.safe} />;
  const view = activityListView(screenReads, {
    wallet,
    filter,
    limit,
    now: now(),
    platform: "mobile",
  });

  function choose(next: ActivityFilter) {
    if (next === filter) return;
    selectionHaptic();
    setFilter(next);
    setLimit(ACTIVITY_PAGE);
  }

  const header = (
    <View style={styles.header}>
      <Text variant="h1">{copy.title}</Text>
      {view.kind !== "none" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.filtersLabel}
          contentContainerStyle={styles.chips}
        >
          {ACTIVITY_FILTERS.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              active={option.id === filter}
              onPress={() => choose(option.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
      <SectionList
        sections={
          view.kind === "list"
            ? view.sections.map((section) => ({ ...section, data: section.rows }))
            : []
        }
        keyExtractor={(row) => row.id}
        ListHeaderComponent={header}
        ListFooterComponent={
          view.kind === "list" && view.olderNotKept ? (
            <Text variant="faint" style={styles.older}>
              {view.olderNotKept}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          view.kind === "none" ? (
            <EmptyState title={view.title} detail={view.detail} />
          ) : view.kind === "noMatch" ? (
            <Text tone="dim" style={styles.noMatch}>
              {view.title}
            </Text>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text variant="faint" accessibilityRole="header" style={styles.day}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <ActivityRow row={item} onPress={() => setOpened(item.id)} />}
        stickySectionHeadersEnabled={false}
        onEndReached={() => {
          if (view.kind === "list" && view.more) setLimit((current) => current + ACTIVITY_PAGE);
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
        indicatorStyle="white"
      />
      <ActivityDetailSheet
        entryId={opened}
        onClose={() => setOpened(null)}
        onOpenPortfolio={onOpenPortfolio}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  content: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingBottom: layout.section },
  header: { gap: layout.group, paddingTop: layout.gutter, paddingBottom: layout.tight },
  chips: { gap: layout.tight },
  day: { paddingTop: layout.group, paddingBottom: layout.hairline },
  older: { paddingTop: layout.group },
  noMatch: { paddingTop: layout.section, textAlign: "center" },
});
