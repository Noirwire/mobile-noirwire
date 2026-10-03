/** An address cut into groups of four characters, the last group taking what is left. */
export function addressGroups(address: string): string[] {
  const groups: string[] = [];
  for (let start = 0; start < address.length; start += 4) {
    groups.push(address.slice(start, start + 4));
  }
  return groups;
}

/**
 * The address as it is shown once revealed: groups of four over two lines,
 * the first line taking the extra group when the count is odd.
 */
export function addressLines(address: string): [string, string] {
  const groups = addressGroups(address);
  const split = Math.ceil(groups.length / 2);
  return [groups.slice(0, split).join(" "), groups.slice(split).join(" ")];
}

/** What a screen reader says for a revealed address: each group of four, one after another. */
export function spokenAddress(address: string): string {
  return addressGroups(address)
    .map((group) => group.split("").join(" "))
    .join(", ");
}
