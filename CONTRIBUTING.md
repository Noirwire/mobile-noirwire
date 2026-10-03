# Contributing

## Before you commit

Run these. CI runs the same checks, plus `npm run doctor` and the web export, and a pull request does not merge until they pass.

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
```

`npm run format` fixes formatting. The first `npm run test:e2e` needs Chromium: `npx playwright install chromium`.

## UI tests

A change to a screen keeps its journeys passing in both UI suites: `e2e/` (Playwright on the web export, run in CI) and `.maestro/` (Maestro on a native build, run on a device). Select elements by role and accessible label, the way a person using a screen reader finds them, and add a `testID` only where no label can tell an element apart. A new relay route the app calls needs a fixture in `e2e/support/relay.ts`; the suite fails on any request it does not answer.

## Commits

- Keep the subject under 50 characters.
- Start it with a conventional prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:` or `build:`.
- Write it in the imperative: `fix: refuse address in route`, not `fixed` or `fixes`.
- One change per commit. Explain why in the body when the reason is not obvious from the change.

## Code

- Small modules with one job each, named in the product's words: portfolio, funding wallet, tracker.
- No dead code and no commented-out code. Comment only where the reason is not obvious.
- Build what the change needs and nothing more. A new dependency needs a reason in the pull request.
- Use the components and tokens in `src/ui/`. A colour, radius or type size that is not in `src/ui/theme.ts` does not belong on a screen.
- Import `Buffer` from the `buffer` package and import icons one file at a time. The README explains both.
- Native configuration lives in `app.config.ts`. `ios/` and `android/` are generated and never committed.

## The guarantees

Read the Security section of the README first. A change that weakens one of them will not be merged, whatever else it does. In particular: never put a wallet address in a route parameter, a log line or an error message.

## Text people read

- Say "portfolio", "funding wallet" and "trackers".
- No em dashes. Three periods for an ellipsis.
- Say plainly what happened and what to do next.

## Security issues

Do not open an issue or a pull request for a vulnerability. See [SECURITY.md](SECURITY.md).
