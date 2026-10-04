import { commonCopy } from "@noirwire/shared/copy";
import type { ReactNode } from "react";
import { EmptyState, Screen, Text } from "@/ui";

type PlaceholderProps = {
  title: string;
  /** What this screen will hold once it is built. */
  detail: string;
  /** The screen sits under a navigation header that already shows its title. */
  underHeader?: boolean;
  action?: ReactNode;
};

/** A route that exists and is reachable, with its real screen still to be built. */
export function Placeholder({ title, detail, underHeader = false, action }: PlaceholderProps) {
  return (
    <Screen edges={underHeader ? ["right", "bottom", "left"] : undefined}>
      {!underHeader && <Text variant="h1">{title}</Text>}
      <EmptyState title={commonCopy.nothingHereYet} detail={detail} action={action} />
    </Screen>
  );
}
