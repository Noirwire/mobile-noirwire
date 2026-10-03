/* global maestro, output */
// Collects the twelve or twenty-four words from the copied cell labels
// ("Word 3, apple") into output.words, keyed by position.
output.words = output.words || {};
const match = /^Word (\d+), (\S+)$/.exec(maestro.copiedText.trim());
if (match) output.words[match[1]] = match[2];
