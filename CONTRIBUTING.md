# Contributing

## Before you commit

Run all four. CI runs the same checks and a pull request does not merge until they pass.

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
```

`npm run format` fixes formatting.

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

Read the Guarantees section of the README first. A change that weakens one of them will not be merged, whatever else it does. In particular: never put a wallet address in a route parameter, a log line or an error message.

## Text people read

- Say "portfolio", "funding wallet" and "trackers".
- No em dashes. Three periods for an ellipsis.
- Say plainly what happened and what to do next.

## Security issues

Do not open an issue or a pull request for a vulnerability. See [SECURITY.md](SECURITY.md).
