import { readFileSync } from "node:fs";

// Prints Jest's coverage totals as a Markdown table for the job summary.
const { total } = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const rows = ["statements", "branches", "functions", "lines"].map(
  (name) => `| ${name} | ${total[name].pct}% | ${total[name].covered} / ${total[name].total} |`,
);
console.log(
  ["## Jest coverage", "", "| Measure | Covered | Count |", "| --- | --- | --- |", ...rows].join(
    "\n",
  ),
);
