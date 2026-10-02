import type { Icon } from "phosphor-react-native";
import { AirplaneIcon } from "phosphor-react-native/src/icons/Airplane";
import { BankIcon } from "phosphor-react-native/src/icons/Bank";
import { BriefcaseIcon } from "phosphor-react-native/src/icons/Briefcase";
import { BuildingsIcon } from "phosphor-react-native/src/icons/Buildings";
import { CarIcon } from "phosphor-react-native/src/icons/Car";
import { ChartLineIcon } from "phosphor-react-native/src/icons/ChartLine";
import { ChartPieIcon } from "phosphor-react-native/src/icons/ChartPie";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { CloudIcon } from "phosphor-react-native/src/icons/Cloud";
import { CoinsIcon } from "phosphor-react-native/src/icons/Coins";
import { CompassIcon } from "phosphor-react-native/src/icons/Compass";
import { CpuIcon } from "phosphor-react-native/src/icons/Cpu";
import { DiamondIcon } from "phosphor-react-native/src/icons/Diamond";
import { FactoryIcon } from "phosphor-react-native/src/icons/Factory";
import { FlagIcon } from "phosphor-react-native/src/icons/Flag";
import { FlaskIcon } from "phosphor-react-native/src/icons/Flask";
import { GlobeIcon } from "phosphor-react-native/src/icons/Globe";
import { GraduationCapIcon } from "phosphor-react-native/src/icons/GraduationCap";
import { HeartIcon } from "phosphor-react-native/src/icons/Heart";
import { HeartbeatIcon } from "phosphor-react-native/src/icons/Heartbeat";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { LightningIcon } from "phosphor-react-native/src/icons/Lightning";
import { MountainsIcon } from "phosphor-react-native/src/icons/Mountains";
import { RobotIcon } from "phosphor-react-native/src/icons/Robot";
import { ScalesIcon } from "phosphor-react-native/src/icons/Scales";
import { ShieldIcon } from "phosphor-react-native/src/icons/Shield";
import { ShoppingBagIcon } from "phosphor-react-native/src/icons/ShoppingBag";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TreeIcon } from "phosphor-react-native/src/icons/Tree";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { WifiHighIcon } from "phosphor-react-native/src/icons/WifiHigh";

/** The glyph ids a portfolio's mark can be set to, with the icon each one draws. Same ids as the web app. */
export const IDENTITY_GLYPHS = {
  compass: CompassIcon,
  target: TargetIcon,
  flag: FlagIcon,
  mountains: MountainsIcon,
  house: HouseIcon,
  graduation: GraduationCapIcon,
  airplane: AirplaneIcon,
  heart: HeartIcon,
  shield: ShieldIcon,
  clock: ClockIcon,
  globe: GlobeIcon,
  tree: TreeIcon,
  sun: SunIcon,
  lightning: LightningIcon,
  "chart-line": ChartLineIcon,
  "chart-pie": ChartPieIcon,
  buildings: BuildingsIcon,
  factory: FactoryIcon,
  heartbeat: HeartbeatIcon,
  flask: FlaskIcon,
  cpu: CpuIcon,
  robot: RobotIcon,
  cloud: CloudIcon,
  wifi: WifiHighIcon,
  car: CarIcon,
  truck: TruckIcon,
  shopping: ShoppingBagIcon,
  coins: CoinsIcon,
  briefcase: BriefcaseIcon,
  scales: ScalesIcon,
  bank: BankIcon,
  diamond: DiamondIcon,
} as const satisfies Record<string, Icon>;

export type IdentityGlyph = keyof typeof IDENTITY_GLYPHS;

export const IDENTITY_TINTS = [
  "neutral",
  "sage",
  "blue",
  "lilac",
  "clay",
  "ochre",
  "teal",
  "rose",
] as const;

export type IdentityTint = (typeof IDENTITY_TINTS)[number];
