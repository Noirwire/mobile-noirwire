import { Link } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  Acknowledge,
  BalanceHeader,
  Button,
  CameraAccess,
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
  PhraseGrid,
  PieRing,
  QRCode,
  Row,
  Scanner,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Stepper,
  StepList,
  Switch,
  Text,
  type Step,
} from "@/ui";
import { IDENTITY_GLYPHS, IDENTITY_TINTS, type IdentityGlyph } from "@/ui/identityGlyphs";
import { layout } from "@/ui/theme";
import { SheetDemo } from "./SheetDemo";

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
const PAY_WITH = ["USDC", "SOL"] as const;
const RISING = [12, 14, 13, 17, 16, 21, 19, 24, 27, 26, 31];
const FALLING = [31, 28, 29, 24, 25, 20, 22, 17, 15, 16, 12];
const TWELVE =
  "orbit lunar velvet canyon maple ember quartz harbor willow signal pepper drift".split(" ");
const TWENTY_FOUR = [
  ...TWELVE,
  ..."cobalt meadow falcon tundra amber ripple saddle cinder glacier hollow marble thistle".split(
    " ",
  ),
];
const TARGET = [50, 30, 12, 8];
const NOW = [46.9, 29.1, 14.4, 9.6];
const FUNDING: Step[] = [
  {
    key: "sent",
    title: "Sent to the private route",
    caption: "Signed by your funding wallet and handed to the settlement queue.",
    status: "done",
  },
  {
    key: "queue",
    title: "Waiting in the queue",
    caption: "Delivered after 2 to 15 seconds, split across several entries.",
    status: "current",
  },
  {
    key: "arrived",
    title: "Arrived in Investing",
    caption: "Confirmed by reading this portfolio's real balance.",
    status: "waiting",
  },
];
const ORDERS: Step[] = [
  { key: "sp", title: "SP500", status: "done", statusLabel: "Placed" },
  {
    key: "nq",
    title: "Nasdaq",
    status: "failed",
    statusLabel: "Failed",
    reason: "The price moved past your minimum. Nothing was traded.",
  },
  { key: "nv", title: "NVIDIA", status: "skipped", statusLabel: "Not placed" },
];
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
  const [phraseShown, setPhraseShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [biometrics, setBiometrics] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [share, setShare] = useState(50);
  const [scanned, setScanned] = useState<string | null>(null);

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Section title="Mark">
        <View style={styles.wrap}>
          <Mark size={22} />
          <Mark size={40} tone="ink-strong" title="NoirWire" />
          <Mark size={64} tone="faint" />
        </View>
      </Section>

      <Section title="BalanceHeader">
        <BalanceHeader
          label="Total value"
          value="$8,729.89"
          change="+$98.79 (1.2%) held trackers · 24h indicative"
          changeTone="safe"
        />
        <BalanceHeader
          label="Total value"
          value="$1,248,729.89"
          change="-$12,480.12 (0.99%) held trackers · 24h indicative"
          changeTone="danger"
        />
        <BalanceHeader
          label="Total value"
          value="Value unavailable"
          change="Waiting for current balances or market prices"
          unavailable
        />
      </Section>

      <Section title="Text">
        <Text variant="h1">Heading one</Text>
        <Text variant="h2">Heading two</Text>
        <Text variant="lead">Lead text introduces a screen in a sentence or two.</Text>
        <Text>Body text carries everything else.</Text>
        <Text variant="note">Note text is secondary copy that still has to be read.</Text>
        <Text variant="label">Label</Text>
        <Text variant="faint">Faint caption, for nonessential lines only</Text>
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

      <Section title="Acknowledge">
        <Acknowledge
          label="I have saved these words for the next step."
          checked={saved}
          onChange={setSaved}
        />
        <Button label="Continue" disabled={!saved} onPress={() => undefined} />
        <Acknowledge label="Checked" checked onChange={() => undefined} />
        <Acknowledge label="Disabled" checked={false} disabled onChange={() => undefined} />
      </Section>

      <Section title="Switch">
        <Switch
          label="Unlock with Face ID"
          caption="Your password is still needed to view your recovery phrase and to change the password."
          value={biometrics}
          onValueChange={setBiometrics}
        />
        <Switch label="Usage analytics" value={analytics} onValueChange={setAnalytics} />
        <Switch label="Disabled" value={false} disabled onValueChange={() => undefined} />
      </Section>

      <Section title="Stepper">
        <View style={styles.between}>
          <Text>NVDAx</Text>
          <Stepper label="NVDAx share in percent" value={share} onChange={setShare} />
        </View>
        <View style={styles.between}>
          <Text tone="dim">At the minimum</Text>
          <Stepper label="Minimum example" value={0} onChange={() => undefined} />
        </View>
        <View style={styles.between}>
          <Text tone="dim">At the maximum</Text>
          <Stepper label="Maximum example" value={100} onChange={() => undefined} />
        </View>
      </Section>

      <Section title="PieRing">
        <View style={styles.wrap}>
          <PieRing target={TARGET} current={NOW} label="Example mix against its target">
            <Text variant="faint">Invested</Text>
            <Money amount={3196.66} />
          </PieRing>
          <PieRing target={TARGET} size={88} thickness={9} label="Example target mix, 4 trackers">
            <Text variant="note">4</Text>
          </PieRing>
        </View>
        <View style={styles.wrap}>
          <PieRing
            target={TARGET}
            current={[0, 0, 0, 0]}
            size={120}
            label="Target mix, nothing invested"
          >
            <Text variant="faint">Target</Text>
            <Text variant="note">4 trackers</Text>
          </PieRing>
          <PieRing target={[100]} current={[100]} size={120} label="One tracker at 100 percent" />
          <PieRing target={[]} size={120} label="An empty portfolio" />
        </View>
      </Section>

      <Section title="StepList">
        <StepList steps={FUNDING} />
        <StepList steps={ORDERS} />
      </Section>

      <Section title="PhraseGrid">
        <PhraseGrid words={TWELVE} revealed={phraseShown} onReveal={() => setPhraseShown(true)} />
        {phraseShown && (
          <Button label="Hide phrase" variant="quiet" onPress={() => setPhraseShown(false)} />
        )}
        <Text variant="faint">Twenty-four words, revealed, with the warned Copy:</Text>
        <PhraseGrid words={TWENTY_FOUR} revealed onReveal={() => undefined} copyable />
      </Section>

      <Section title="QRCode">
        <QRCode value="noirwire-gallery-example" label="Example QR code" />
      </Section>

      <Section title="Scanner">
        <Scanner hint="Point the camera at the recipient's address code." onRead={setScanned} />
        {scanned !== null && <Text variant="note">{`Read: ${scanned}`}</Text>}
        <Text variant="faint">Without the camera, before and after it is refused:</Text>
        <CameraAccess state="ask" onAllow={() => undefined} />
        <CameraAccess state="blocked" onAllow={() => undefined} />
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
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="A sheet"
          footer={<Button label="Done" onPress={() => setSheetOpen(false)} />}
        >
          <Text tone="dim">
            It rises from the bottom edge, and closes from the backdrop, the close control or a pull
            down on its header.
          </Text>
        </Sheet>
        <SheetDemo />
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
  section: { gap: layout.group },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: layout.group },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  route: { paddingVertical: layout.inset },
});
