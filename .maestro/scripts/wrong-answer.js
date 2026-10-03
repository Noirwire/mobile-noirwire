/* global maestro, output */
// A pattern for any choice except the word at the asked position.
const match = /number (\d+)/.exec(maestro.copiedText);
const right = match ? output.words[match[1]] : "";
output.wrong = "^(?!" + right + "$)[a-z]+$";
