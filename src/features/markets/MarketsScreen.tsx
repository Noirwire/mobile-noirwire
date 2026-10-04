import { MARKET_PAGE_SIZE as PAGE, type MarketCategory } from "@noirwire/shared/application";
import { marketsCopy } from "@noirwire/shared/copy";
import { livePricesVersion } from "@noirwire/shared/infrastructure";
import { marketsView, STILL_WORKING_AFTER_MS } from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { XCircleIcon } from "phosphor-react-native/src/icons/XCircle";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  Notice,
  Skeleton,
  Text,
  useWaiting,
  WaitingPlaceholder,
  type Waiting,
} from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { colors, fonts, layout, radius, size } from "@/ui/theme";
import { controlText, maxFontScale } from "@/ui/typography";
import { phoneCopy } from "../phoneCopy";
import { TrackerCard, TrackerRow } from "./TrackerRow";
import { useLivePrices, useWalletSnapshot } from "./useMarketData";
import { toggleWatch } from "./watchlist";

type MarketsScreenProps = {
  onOpen: (symbol: string) => void;
  /** A link from outside named a tracker that does not exist: Markets says so. */
  unknownTracker?: boolean;
  /** Set for a visitor without a wallet: no watchlist, and one way forward. */
  visitor?: { onCreate: () => void; createLabel: string };
};

const SKELETON_ROWS = 8;

/** Spec 2.18, and 2.2 in visitor mode: find a tracker. */
export function MarketsScreen({ onOpen, unknownTracker = false, visitor }: MarketsScreenProps) {
  const wallet = useWalletSnapshot();
  const updatedAt = useLivePrices();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketCategory>("all");
  const [shown, setShown] = useState(PAGE);
  const waiting = useWaiting(updatedAt === null, "content");
  // With no live price the list's place is held: until the limit while nothing
  // at all has answered, and only for a moment once something has, since that
  // may have been the prices failing. After that the trackers are listed
  // without prices, and the screen says the prices are missing.
  const firstLoad =
    updatedAt === null &&
    (livePricesVersion() === 0
      ? !waiting.overdue
      : waiting.elapsedMs < STILL_WORKING_AFTER_MS.content);
  const pricesMissing = updatedAt === null && !firstLoad;
  const view = marketsView(screenReads, {
    query,
    category,
    shown,
    watchlist: visitor ? null : (wallet?.watchlist ?? []),
    updatedAt,
    platform: "mobile",
  });

  function choose(next: MarketCategory) {
    if (next === category) return;
    selectionHaptic();
    setCategory(next);
    setShown(PAGE);
  }

  const list = (rows: typeof view.browse.rows) =>
    rows.map((row) => (
      <TrackerRow key={row.symbol} row={row} onOpen={onOpen} onStar={toggleWatch} />
    ));

  return (
    <Frame visitor={visitor}>
      {!visitor && <Text variant="h1">{view.title}</Text>}
      {unknownTracker && <Notice>{marketsCopy.detail.notFound}</Notice>}
      <View style={styles.search}>
        <Text variant="label">{view.search.label}</Text>
        <View style={styles.searchBox}>
          <MagnifyingGlassIcon size={size.iconSmall} color={colors.faint} />
          <TextInput
            accessibilityLabel={view.search.label}
            value={query}
            onChangeText={setQuery}
            placeholder={view.search.placeholder}
            placeholderTextColor={colors.faint}
            selectionColor={colors.ink}
            keyboardAppearance="dark"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={maxFontScale.body}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <IconButton label={view.search.clear} onPress={() => setQuery("")}>
              <XCircleIcon size={size.iconSmall} color={colors.dim} />
            </IconButton>
          )}
        </View>
      </View>

      {view.searching ? (
        <View style={styles.group}>
          <Text variant="faint">{view.searching.count}</Text>
          {view.searching.empty ? (
            <Text tone="dim">{view.searching.empty}</Text>
          ) : (
            list(view.searching.rows)
          )}
        </View>
      ) : firstLoad ? (
        <Loading waiting={waiting} />
      ) : (
        <>
          {pricesMissing && <Notice tone="warning">{phoneCopy.overdue.prices}</Notice>}
          {view.moversWaiting && <Text variant="faint">{view.moversWaiting}</Text>}
          {view.shelves.map((shelf) => (
            <View key={shelf.key} style={styles.group}>
              <View style={styles.shelfHead}>
                <Text accessibilityRole="header" style={styles.heading}>
                  {shelf.title}
                </Text>
                {shelf.trailing && <Text variant="faint">{shelf.trailing}</Text>}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shelf}
              >
                {shelf.rows.map((row) => (
                  <TrackerCard key={row.symbol} row={row} onOpen={onOpen} />
                ))}
              </ScrollView>
            </View>
          ))}
          <View style={styles.group}>
            <Text accessibilityRole="header" style={styles.heading}>
              {view.browse.title}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {view.browse.categories.map((entry) => (
                <Chip
                  key={entry.category}
                  label={entry.label}
                  active={entry.active}
                  onPress={() => choose(entry.category)}
                />
              ))}
            </ScrollView>
            {view.browse.empty ? (
              <EmptyState title={view.browse.empty.title} detail={view.browse.empty.detail} />
            ) : (
              list(view.browse.rows)
            )}
            {view.browse.more && (
              <Button
                variant="quiet"
                label={view.browse.more}
                onPress={() => setShown(shown + PAGE)}
              />
            )}
          </View>
        </>
      )}
    </Frame>
  );
}

function Loading({ waiting }: { waiting: Waiting }) {
  return (
    <WaitingPlaceholder waiting={waiting}>
      <View style={styles.shelf}>
        <Skeleton width={152} height={112} />
        <Skeleton width={152} height={112} />
      </View>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} height={56} />
      ))}
    </WaitingPlaceholder>
  );
}

const TAB_EDGES: readonly Edge[] = ["top", "right", "left"];
const UNDER_HEADER: readonly Edge[] = ["right", "left"];

/** The tab's screen, or the visitor's, which sits under a header and keeps its one button pinned. */
function Frame({
  visitor,
  children,
}: {
  visitor: MarketsScreenProps["visitor"];
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={visitor ? UNDER_HEADER : TAB_EDGES}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        indicatorStyle="white"
      >
        {children}
      </ScrollView>
      {visitor && (
        <SafeAreaView edges={["bottom"]} style={styles.bar}>
          <Button label={visitor.createLabel} onPress={visitor.onCreate} />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  fill: { flex: 1 },
  content: { padding: layout.gutter, gap: layout.section },
  search: { gap: layout.tight },
  searchBox: {
    minHeight: size.control,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.tight,
    paddingLeft: layout.group,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: size.control,
    fontSize: controlText.fontSize,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  group: { gap: layout.inset },
  shelfHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { fontFamily: fonts.medium },
  shelf: { flexDirection: "row", gap: layout.inset },
  chips: { gap: layout.tight },
  bar: {
    paddingHorizontal: layout.gutter,
    paddingTop: layout.tight,
    paddingBottom: layout.tight,
    borderTopWidth: 1,
    borderTopColor: colors["line-subtle"],
    backgroundColor: colors.base,
  },
});
