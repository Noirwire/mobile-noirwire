/* global maestro, output */
// Reads "Which word is number N?" from the copied text and puts the word at
// that position in output.answer.
const match = /number (\d+)/.exec(maestro.copiedText);
output.answer = match ? output.words[match[1]] : "";
