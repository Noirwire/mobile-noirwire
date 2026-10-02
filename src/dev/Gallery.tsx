import { Link } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Chart,
  Chip,
  Delta,
  Divider,
  EmptyState,
  Field,
  IdentityMark,
  Mark,
  Money,
  Notice,
  Panel,
  Row,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Text,
} from "@/ui";
import { IDENTITY_GLYPHS, IDENTITY_TINTS, type IdentityGlyph } from "@/ui/identityGlyphs";
import { space } from "@/ui/theme";

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
const PAY_WITH = ["USDC", "SOL"] as const;
const RISING = [12, 14, 13, 17, 16, 21, 19, 24, 27, 26, 31];
const FALLING = [31, 28, 29, 24, 25, 20, 22, 17, 15, 16, 12];
const ROUTES = [
  "/welcome",
  "/create",
  "/import",
  "/set-password",
  "/unlock",
  "/(tabs)",
  "/markets",
  "/earn",
  "/activity",
  "/settings",
  "/portfolio/example",
  "/markets/EXAMPLE",
  "/trade",
  "/send",
  "/receive",
  "/fund",
  "/new-portfolio",
  "/pie-builder",
  "/pie-order",
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label">{title}</Text>
      {children}
    </View>
  );
}

/** Every component of the kit in every state, for looking at on a device. Shapes only: no figure here is real. */
export function Gallery() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1W");
  const [payWith, setPayWith] = useState<(typeof PAY_WITH)[number]>("USDC");
  const [chip, setChip] = useState("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Section title="Mark">
        <View style={styles.wrap}>
          <Mark size={22} />
          <Mark size={40} tone="ink-strong" title="NoirWire" />
          <Mark size={64} tone="faint" />
        </View>
      </Section>

      <Section title="Text">
        <Text variant="h1">Heading one</Text>
        <Text variant="h2">Heading two</Text>
        <Text variant="lead">Lead text introduces a screen in a sentence or two.</Text>
        <Text>Body text carries everything else.</Text>
        <Text variant="label">Label</Text>
        <Text variant="faint">Faint supporting text</Text>
      </Section>

      <Section title="Button">
        <Button label="Primary" onPress={() => undefined} />
        <Button label="Primary loading" loading />
        <Button label="Primary disabled" disabled />
        <Button label="Quiet" variant="quiet" onPress={() => undefined} />
        <Button label="Quiet disabled" variant="quiet" disabled />
        <Button label="Danger" variant="danger" onPress={() => undefined} />
        <Button label="Danger loading" variant="danger" loading />
        <Button label="Danger disabled" variant="danger" disabled />
      </Section>

      <Section title="Field">
        <Field label="Portfolio name" placeholder="Long term" />
        <Field label="Password" secure value={password} onChangeText={setPassword} />
        <Field label="Amount" defaultValue="abc" error="Enter an amount in numbers." />
      </Section>

      <Section title="Segmented">
        <Segmented label="Chart range" options={RANGES} value={range} onChange={setRange} />
        <Segmented label="Pay with" options={PAY_WITH} value={payWith} onChange={setPayWith} />
      </Section>

      <Section title="Chip">
        <View style={styles.wrap}>
          {["All", "Trades", "Funding"].map((label) => (
            <Chip
              key={label}
              label={label}
              active={chip === label}
              onPress={() => setChip(label)}
            />
          ))}
        </View>
      </Section>

      <Section title="Notice">
        <Notice title="What you are buying">A tracker follows a price. It is not a share.</Notice>
        <Notice tone="warning">Your trade, amount and timing are public.</Notice>
        <Notice tone="danger" title="This cannot be undone">
          Anyone with the recovery phrase controls the wallet.
        </Notice>
      </Section>

      <Section title="Panel, Row and Divider">
        <Panel>
          <Row label="You pay" value={<Money amount={1234.5} symbol="USDC" />} />
          <Row label="You receive" value={<Money amount={1.5} symbol="SOL" />} />
          <Row label="Network cost" value={<Money amount={0.02} />} />
          <Row label="Route" value="Best available" last />
        </Panel>
        <Panel raised>
          <Text>A raised panel</Text>
        </Panel>
        <Divider />
      </Section>

      <Section title="Money and Delta">
        <Money variant="h1" amount={1234.5} />
        <Money amount={-42} />
        <Delta percent={2.345} />
        <Delta percent={-1.2} />
        <Delta percent={4.26} gain={52.1} />
        <Delta percent={-4.26} gain={-52.1} />
      </Section>

      <Section title="Chart">
        <Chart points={RISING} label="A rising example series" height={160} />
        <Chart points={FALLING} label="A falling example series" height={160} />
      </Section>

      <Section title="IdentityMark">
        <View style={styles.wrap}>
          <IdentityMark size="sm" />
          <IdentityMark size="md" />
          <IdentityMark size="lg" />
          {IDENTITY_TINTS.map((tint) => (
            <IdentityMark key={tint} glyph="target" tint={tint} />
          ))}
        </View>
        <View style={styles.wrap}>
          {(Object.keys(IDENTITY_GLYPHS) as IdentityGlyph[]).map((glyph) => (
            <IdentityMark key={glyph} glyph={glyph} size="sm" />
          ))}
        </View>
      </Section>

      <Section title="Skeleton">
        <Skeleton width="60%" height={28} />
        <Skeleton />
        <Skeleton width="40%" />
      </Section>

      <Section title="Sheet">
        <Button label="Open a sheet" variant="quiet" onPress={() => setSheetOpen(true)} />
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="A sheet">
          <Text tone="dim">It rises from the bottom edge and closes from the backdrop.</Text>
          <Button label="Done" onPress={() => setSheetOpen(false)} />
        </Sheet>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="Nothing here yet"
          detail="An empty state says what will appear and how to begin."
          action={<Button label="Begin" onPress={() => undefined} />}
        />
      </Section>

      <Section title="Routes">
        {ROUTES.map((route) => (
          <Link key={route} href={route} style={styles.route}>
            <Text tone="dim">{route}</Text>
          </Link>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[3] },
  route: { paddingVertical: space[3] },
});
