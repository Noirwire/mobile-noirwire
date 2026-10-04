# NoirWire mobile: screen-by-screen UX specification

Status: build specification for v1 of the React Native (Expo) app.
Behavioural reference: the NoirWire web app. Where this document and the web app differ, the difference is stated with its reason.

## 0. How to read this document

### 0.1 Binding rules (apply to every screen)

1. Keys and the recovery phrase never leave the device.
2. A wallet address is a secret. It is never placed in a route, a route parameter, a deep link, a log line, an analytics event, a crash report or a notification. Addresses are masked everywhere until the user asks: no screen shows one, in full or shortened, without a tap on "Show". The only addresses shown without that tap are the ones the user is entering or has just entered themselves (the recipient field and the review of a send).
3. One recovery phrase derives one funding wallet and any number of portfolios. They must never be linked on chain by the app. A send from a portfolio to the funding wallet or to another portfolio shows the linking warning and needs an explicit acknowledgement.
4. Vocabulary: "portfolio", "funding wallet", "trackers", "tokens" (for a quantity of a tracker), "Total value" (aggregate), "Portfolio value" (one portfolio), "cash" (USDC inside a portfolio). Never unqualified "stocks" or "shares". Never "free", never "no fees". Never "anonymous", "untraceable" or "hidden trades". No em dashes. An ellipsis in copy is three periods.
5. Every money action has the same lifecycle: enter, review, one Confirm, progress in plain words, result. An unknown outcome says so and blocks a repeat until the chain settles (section 3.3).
6. Honest states: a stale or missing price shows no number. Sample data is labelled. The tracker risk notice appears before every buy. "Trades stay public" appears wherever a user could assume otherwise.
7. Network costs are paid in USDC through NoirWire's relayer. No string in the app names the network's own currency or uses the word "gas", no flow moves or sends it, and nothing is ever converted to pay a cost. A portfolio that happens to hold it shows it as an ordinary holding row and nothing more. When the relayer cannot be used the action is unavailable for now.
8. No screen leads with a warning about the app itself. What can go wrong is stated once, on the Risks screen (2.34); reviews carry one line and a link to it. Nothing claims the app is audited, safe or guaranteed.
9. Dark theme only. Figtree. The raven mark. Colours come from the theme tokens (base, surface, surface-raised, elevated, ink, ink-strong, dim, faint, line-subtle, line, line-strong, safe, warning, danger, and the eight portfolio tints). No raw colour values in screen code.

### 0.2 House design rules as applied to a phone

- One idea per screen. Each screen spec opens with its Purpose in one sentence. If a build of the screen has two competing focal points, it is wrong.
- Whitespace is the design. Screen gutter 20pt. Vertical rhythm in steps of 8pt. Hero blocks get 32pt above and 24pt below. Sections are separated by 32pt of space, not by boxes. A Panel is used only when content is a distinct object (a notice, a review list), not to decorate.
- One accent, one job. The single interactive emphasis is the ink-strong filled primary Button. There is at most one primary Button visible at a time, and on a sheet it is the only filled control: preset amounts are inline Chips, never filled tiles. Safe, warning and danger appear only where they carry that meaning (a gain or a loss, a caution, a refusal). Portfolio tints appear in exactly two places: the portfolio glyph, and the 3pt identity line that says which portfolio a screen or sheet is acting for (section 3.9).
- People before protocol. Company names come before tickers, portfolios before addresses, dollars and USDC costs before mechanics. A portfolio's identity is its own glyph and tint, never a tracker logo. No screen is organised around addresses or chain status. The buy flow uses "buy", "sell", "spend", "receive", never swap vocabulary.
- Motion has a job or it does not exist. Exactly three things move: entering and leaving public view (260 ms ease-out), the portfolio glyph travelling into a sheet header when a portfolio is chosen (220 ms ease-in-out), and a progress step changing state (320 ms ease-out, only when the evidence changes). Balances, price digits, risk text and Confirm buttons never pulse, count or drift. Sheets and stack pushes use the system transitions.
- Three type sizes per screen at most. The Text variants are used as: `display` (the one number or headline the screen is about), `body` (everything a person reads), `caption` (labels, secondary lines). `title` is `body` size at medium weight, so it does not add a size.
- No decorative gradients, no blur except the system scrim behind a sheet, radius 12 for panels and 8 for tiles, pill radius for chips and primary buttons. All motion is under 400 ms and is replaced by an instant change when the system asks for reduced motion.
- The tab bar is flat: five items, icon above label, the active item in ink-strong with a filled icon and a medium-weight label, the others faint. No pill, no highlight shape, no badge.
- One icon set (Phosphor, matching the web app). No emoji.

### 0.3 UI kit vocabulary

Screens are specified with the kit: Text (`display`, `title`, `body`, `caption`), Button (`primary`, `quiet`, `danger`), Field, Screen, Sheet, Panel, Row (label and value), Notice (`info`, `warning`, `danger`), Chip, Segmented, Divider, EmptyState, Skeleton, IdentityMark (portfolio mark and tracker mark), Mark (the raven), Money, Delta, Chart.

Components this spec needs that are not in the kit, each with its reason:

| Component   | Used on                                                                       | Why the kit does not cover it                                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PhraseGrid  | Recovery phrase, Settings phrase reveal                                       | Twelve numbered word cells with a concealed state and capture protection. A Row cannot hold a numbered two-column grid, and concealment has to be one unit so no word renders early.                  |
| Acknowledge | Phrase saved, linking warning, look-alike address                             | An explicit, labelled checkbox with a 44pt target. A toggle Switch reads as a setting, not as consent.                                                                                                |
| Switch      | Biometric unlock, usage analytics                                             | A binary setting. Platform-standard control on both systems.                                                                                                                                          |
| Stepper     | Pie builder                                                                   | Minus, a numeric field, plus, for a whole percent. Field alone gives no one-tap adjustment.                                                                                                           |
| StepList    | Move to portfolio, pie order progress                                         | A vertical list of stages with waiting, running, done and failed marks. Rows have no status mark.                                                                                                     |
| PieRing     | Portfolio detail (pie), pie builder                                           | A ring divided by weight with a centre label. Chart is a time series.                                                                                                                                 |
| QRCode      | Receive                                                                       | Renders an address as a QR code on device.                                                                                                                                                            |
| Scanner     | Send                                                                          | Camera view that reads a QR code.                                                                                                                                                                     |
| TabBar      | Root                                                                          | Provided by the navigation library, styled with the tokens.                                                                                                                                           |
| Shelf       | Markets shelves and chips, Activity filters, portfolio name suggestions       | A horizontally scrolling row that bleeds to the screen edges and restores the gutter as its own content padding, so cards never clip at a hard edge. Neither ScrollView nor a Row is this on its own. |
| TopLoader   | Root (mounted once); every screen and sheet switches it on via `useTopLoader` | The one waiting signal for the whole app (3.11): a thin light under the status bar, or a sheet's own top edge. Not a screen-level component a spec section draws on its own.                          |

### 0.4 States every screen answers

Each screen lists these states. "Standard" means the pattern in section 3 applies unchanged.

- Loading, Empty, Populated, Error
- Offline (section 3.5)
- Price unavailable (section 3.7)
- Relayer unavailable (section 3.1, "Not now")
- Locked mid-flow (section 3.4)

---

## 1. Navigation map

### 1.1 Route tree

```
(root)
├─ network-gate                      full screen, shown instead of everything while the network cannot be verified
├─ (onboarding)                      stack, shown when no wallet is stored
│   ├─ welcome
│   ├─ create/phrase
│   ├─ create/confirm
│   ├─ import/phrase
│   ├─ import/addresses
│   ├─ import/found
│   ├─ password
│   └─ biometric
├─ (visitor)                         shown from Welcome via "Explore trackers"
│   ├─ markets
│   └─ markets/[symbol]
├─ unlock                            full screen gate, shown when a wallet is stored and locked
├─ (tabs)                            shown when unlocked
│   ├─ home
│   │   └─ portfolio/[id]            stack screen, id is the local random id, never an address
│   ├─ markets
│   │   └─ markets/[symbol]          stack screen
│   ├─ earn
│   ├─ activity
│   └─ settings
│       ├─ settings/recovery-phrase  stack screen
│       ├─ settings/password         stack screen
│       ├─ settings/funding-wallet   stack screen
│       ├─ settings/costs            stack screen; also opened from "What does it cost?"
│       ├─ settings/privacy          stack screen
│       ├─ settings/risks            stack screen; also shown as a step inside a money sheet
│       ├─ settings/about            stack screen
│       └─ settings/reset            stack screen
└─ (sheets)                          modal bottom sheets, presented over the tabs
    ├─ fund                          params: portfolio id
    ├─ add-money                     the three steps, with the funding wallet address inside the second
    ├─ receive                       params: portfolio id
    ├─ trade                         params: side, symbol (optional), portfolio id (optional)
    ├─ send                          params: portfolio id
    ├─ earn-action                   params: portfolio id, "deposit" or "withdraw"
    ├─ new-portfolio
    ├─ pie-builder                   params: portfolio id (edit an existing mix)
    ├─ pie-order                     params: portfolio id, "invest" or "rebalance"
    ├─ portfolio-settings            params: portfolio id
    └─ activity-detail               params: activity entry id
```

`portfolio/[id]` and `markets/[symbol]` are registered in both the Home and Markets stacks so that opening a tracker from a holding, or a portfolio from a tracker, pushes onto the current tab and Back returns to where the user was.

### 1.2 Full screen or sheet, and why

| Surface                                                                                                                        | Form                                        | Reason                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding steps                                                                                                               | Full screens in a stack                     | A multi-step, one-time flow that holds the phrase. Apple's guidance is to avoid sheets for prolonged flows, and a full screen can be protected from capture as a whole. |
| Unlock                                                                                                                         | Full screen gate                            | It replaces the app, it does not sit over it. Nothing behind it may be visible.                                                                                         |
| Tabs                                                                                                                           | Full screens with a tab bar                 | Five peer destinations. Both platforms put three to five destinations in a bottom bar with labels always shown.                                                         |
| Portfolio detail, tracker detail                                                                                               | Pushed stack screens, tab bar stays visible | They are places in the hierarchy, not tasks. Apple asks that the tab bar stay visible while navigating within a section.                                                |
| Settings sub-pages                                                                                                             | Pushed stack screens                        | Reading and security tasks that need the whole screen. Recovery phrase needs capture protection for the entire screen.                                                  |
| Trade, send, fund, add money, receive, earn action, pie order, pie builder, new portfolio, portfolio settings, activity detail | Modal bottom sheets                         | Each is one self-contained task the user completes or cancels before returning to the parent, which is what a sheet is for on both platforms. They cover the tab bar.   |

Sheet rules, one behaviour on both platforms:

- A money sheet opens at full height (the large detent only). Its content is a form, then a review; a half-height sheet would hide the Confirm button behind a scroll.
- Receive, portfolio settings, activity detail and new portfolio open at their content height and can grow to full height.
- Every sheet has a grabber, a title, and a close control (an X, top trailing) on its first step. From the second step on, the top leading control is Back and it goes one step back, never out of the sheet.
- One sheet at a time. A sheet never presents another sheet. Choosing a tracker, choosing a portfolio and scanning a QR code are steps inside the same sheet. Moving from one task to another (for example trade to fund because the portfolio has no cash) closes the first sheet, then opens the second.
- Swipe down and tap on the scrim dismiss a sheet only while nothing has been typed and nothing is in flight. Once there is input, the swipe asks first with an alert: title "Discard this?", buttons "Keep editing" and "Discard". While an action is in flight (after Confirm, before a result) the sheet cannot be dismissed at all.

### 1.3 Back behaviour

- iOS: the edge swipe and the top leading chevron pop one stack screen. Inside a sheet the edge swipe is disabled; Back is the top leading control.
- Android: the system back gesture and button follow the same order everywhere: (1) close the keyboard, (2) go one step back inside a sheet, (3) dismiss the sheet under the rules above, (4) pop a stack screen, (5) from a non-Home tab root go to Home, (6) from Home leave the app. This is the one place the two platforms differ on purpose, because Android users expect back to work everywhere and predictive back previews it.
- Android back on Unlock leaves the app. It never bypasses the gate.
- Onboarding: Back from Confirm phrase returns to the phrase. Back from Set password returns to Confirm phrase (create) or to the import result (import). Back from Welcome leaves the app on Android.
- Back is disabled while an action is in flight.
- Switching tabs keeps each tab's stack. Tapping the active tab pops to its root and scrolls to the top.

### 1.4 Deep links

Scheme `noirwire://` and the app's universal link domain. The only accepted targets:

| Link                | Opens                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `/markets`          | Markets tab                                                                                              |
| `/markets/[symbol]` | Tracker detail, if the symbol is in the catalog; otherwise Markets with the Notice "No such investment." |

One allow-list decides this for every link, before the router sees it: `src/navigation/deepLinks.ts`, called from `app/+native-intent.ts`.
| `/earn`, `/activity`, `/settings` | That tab |

Rules:

- No link carries an address, a portfolio id, an amount, a recipient or a side. A link with unknown or extra parameters has them dropped. A link to anything else opens Home.
- A link never opens a sheet and never prefills a money action.
- With no wallet stored, only the two markets links are honoured (visitor mode). Any other link opens Welcome.
- With a locked wallet, the link is held, Unlock is shown, and the link is followed after a successful unlock. It is dropped if the app is closed first.
- Solana Pay and wallet-connection links are not handled in v1 (section 4).

### 1.5 Cold start

Every cold start begins with the splash (Mark, centred, on base) while the app checks two things: whether a wallet record is stored, and whether the network is the expected one.

| Wallet state               | What the user sees                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network cannot be verified | Network gate (2.0). Nothing else opens.                                                                                                                           |
| No wallet                  | Welcome (2.1).                                                                                                                                                    |
| Wallet stored, locked      | Unlock (2.10). A cold start is always locked: nothing decrypted is ever written to disk. If biometric unlock is on, the system prompt appears at once.            |
| Unlocked                   | Only possible when returning from the background inside the idle window. The app resumes exactly where it was, behind the privacy cover until it is active again. |

After unlock the user lands on Home, or on a held deep link.

---

## 2. Screens and sheets

Thirty-five surfaces are specified, numbered 2.0 to 2.33. Steps inside a sheet (choosing a tracker, choosing a portfolio, scanning a QR code) are specified with their sheet.

### 2.0 Network gate

**Purpose.** Refuse to show balances or offer signing until the app has proved which network it is talking to, without holding back what needs no network: unlocking a wallet the phone already stores.

**Entry points.** Cold start, before any other screen. Retry from this screen.

**Layout.**

1. Screen, content centred vertically.
2. Mark, 40pt.
3. Text `body`, centred: the message for the state.
4. Button `quiet` "Try again" (unreachable state only).

**States.**

- Loading: the splash stays up, and waits by the waiting standard (3.11): nothing for the first 300 ms, then a Text `caption` "Getting things ready..." under the Mark, then the calm "still checking" line. A check that has not answered after 20 seconds counts as unreachable.
- Error, unreachable, no wallet stored: "Can't reach NoirWire. Check your connection and try again." with "Try again". The balances wording is never said to someone with no wallet.
- Error, unreachable, a wallet stored and locked: the gate opens for Unlock (2.10), which shows the same sentence as a Notice `info` with its own "Try again". Unlocking reads only the phone. After the unlock the app is open: Home and every other screen that reads the chain show their own waiting and their own failure ("We couldn't update your balances..."), the network is asked again every 15 seconds, and a pass removes the notice. Every signature is still refused until the network has been proved, by the check that runs before it.
- Error, unreachable, a wallet already unlocked as the app opens: "We can't show your balances right now. Your money has not moved. Try again." with "Try again".
- Error, wrong network: "NoirWire is not connected to Solana mainnet as it should be. Your money has not moved, and nothing can be sent until this is fixed. Try again later." No button. This closes the app even when it was opened for an unlock.
- Offline: same as unreachable.
- Empty, Populated, Price unavailable, Relayer unavailable, Locked mid-flow: not applicable.

**Interactions.** "Try again" repeats the check. A pass replaces this screen with the screen for the wallet state.

**Disabled.** Nothing.

**Haptics.** None.

**Accessibility.** The message is announced on appearance. "Try again" is the only focusable control.

**Never shows.** A balance or an address. The unlock form only for a stored, locked wallet.

**Shared logic.** Verify the network identity. `unreachableView` chooses the words and whether Unlock is offered.

---

### 2.1 Welcome

**Purpose.** Say what NoirWire is for in one line and offer the three ways in.

**Entry points.** Cold start with no wallet. After a reset.

**Layout.** Drawn from `welcomeView("mobile")`.

1. Screen, scrollable, gutter 20pt. Top inset 48pt.
2. Mark, 28pt, with Text `caption` "NoirWire" beside it.
3. Text `display`: "Invest in US stock trackers. Privately."
4. Text `body` (dim): "Trackers follow share prices like Apple, Tesla or the S&P 500. You do not own the shares."
5. Text `body` (dim): "Each portfolio is separate from your funding wallet. Trades themselves are public."
6. 32pt space.
7. Button `primary`, full width: "Create a wallet". It is the only filled button.
8. Button `quiet`, full width: "Restore a wallet".
9. Button `quiet`, full width: "Explore trackers".
10. 32pt space.
11. Text `caption` (faint): "No account and no ID check. Only your recovery words can restore your wallet."

How requests reach the network is not explained here; it is in Settings, Privacy (2.32). The web app's example portfolio card is not carried over: the phone keeps this screen to one idea.

A development build adds one small link, "UI kit", in the top trailing corner, outside the column above. No other build draws it, and it is never part of the column.

**States.** Loading, Empty, Error, Price unavailable, Relayer unavailable, Locked mid-flow: not applicable. Offline: the screen works; creating a wallet needs no network. Populated: as above.

**Interactions.**

- "Create a wallet" generates a new twelve-word phrase in memory and goes to 2.3. Nothing is stored until a password is set, so leaving onboarding leaves nothing behind.
- "Restore a wallet" goes to 2.5.
- "Explore trackers" goes to 2.2.

**Disabled.** Nothing.

**Haptics.** None.

**Accessibility.** Reading order top to bottom as listed. The headline is the screen's heading. All three actions are buttons with their visible text as the label.

**Never shows.** A price, a rate, a real balance, an unlabelled example figure, anything about servers.

**Shared logic.** Create a wallet draft.

---

### 2.2 Explore trackers (markets without a wallet)

**Purpose.** Let a visitor browse trackers and prices before committing to a wallet.

**Entry points.** "Explore trackers" on Welcome. A markets deep link with no wallet stored.

**Layout.** The Markets screen (2.18) and Tracker detail (2.19) in visitor mode, with these differences:

1. No tab bar. A top bar with a leading Back to Welcome and the title "Markets".
2. No watchlist: the "My watchlist" shelf and filter are absent, and rows carry no star.
3. A bottom bar pinned above the safe area with one Button `primary`, full width: "Create a wallet to invest".
4. On Tracker detail there is no "Your holding" section, and the bottom bar shows the same single button instead of Buy and Sell.

**States.** As 2.18 and 2.19. Locked mid-flow: not applicable, there is no wallet.

Other states. Offline, Loading, Empty, Error and Price unavailable behave exactly as on Markets and Tracker detail. Relayer unavailable: not applicable, a visitor cannot act.

**Interactions.** "Create a wallet to invest" returns to Welcome. After the wallet is created and unlocked, the app opens the tracker the visitor was viewing, if any.

**Disabled.** Nothing.

**Haptics.** Light impact on chip selection, as Markets.

**Accessibility.** As Markets.

**Never shows.** A trade form, a balance, a watchlist, any prompt that implies an order can be placed without a wallet.

**Shared logic.** Read live prices. Read price history. Search the catalog.

---

### 2.3 Create: recovery phrase

**Purpose.** Get the twelve words onto paper.

**Entry points.** "Create my wallet". "Back to the phrase" from 2.4.

**Layout.**

1. Screen with a top bar: leading Back, no title.
2. Text `display`: "Write these twelve words down."
3. Text `body` (dim): "These words are the only way back into your money if this phone is lost. Write them on paper. Anyone who sees them can take everything."
4. PhraseGrid: two columns, six rows, each cell a faint two-digit number ("01" to "12") and the word. Concealed on arrival: every word is replaced by six dots and the grid is covered by an elevated tile holding a Button `primary` "Reveal phrase".
5. Acknowledge: "I have saved these words for the next step."
6. Button `primary`, full width: "Continue".
7. Text `caption` (faint): "NoirWire never asks for these words. Nobody from NoirWire will ever ask you for them."

There is no Copy button. The web app offers one and clears the clipboard after 30 seconds; a phone clipboard can sync to other devices and is readable by keyboards and other apps, so the phone leaves it out.

**States.** Populated only. Loading, Empty, Error, Offline, Price unavailable, Relayer unavailable: not applicable (works offline). Locked mid-flow: not applicable. If the app goes to the background the grid conceals itself again and must be revealed again on return.

**Interactions.**

- "Reveal phrase" shows the words. Until then "Continue" renders as `quiet` and disabled, so Reveal is the screen's one primary button; after the reveal, "Continue" is the primary.
- "Continue" goes to 2.4.

**Disabled.** "Continue" is disabled until the phrase has been revealed and the acknowledgement is checked. Reason shown as Text `caption` under the button while disabled: "Reveal the words and confirm you have saved them."

**Haptics.** Light impact on reveal.

**Accessibility.** After reveal, each cell reads "Word 1, [word]". Before reveal the grid reads "Recovery phrase, hidden" and the Reveal button is the next element. At large text sizes the grid becomes one column. Words never truncate.

**Never shows.** The words before the user taps Reveal. A Copy or Share control. The words in the app switcher or in a screenshot: this screen is capture-protected (section 3.6).

**Shared logic.** Read the draft phrase.

---

### 2.4 Create: confirm phrase

**Purpose.** Prove the words were written down, by asking for three of them.

**Entry points.** "Continue" from 2.3.

**Layout.**

1. Screen with a top bar: leading Back.
2. Text `display`: "Confirm your phrase"
3. Text `body` (dim): "Pick the word at each position from the list you wrote down."
4. Text `caption` (faint): "Question 1 of 3"
5. Text `title`: "Which word is number 7?"
6. Four Chips in a two-by-two grid, each 52pt tall: the correct word and three decoys.
7. Button `quiet`: "Show phrase again".

**States.**

- Populated: as above.
- Error, a wrong pick: the user stays on the same question. The chip they picked is disabled, and a Notice `warning` appears under the question: "Check word 7 on your paper." The remaining chips stay available.
- Error, three wrong picks in one attempt: the attempt restarts. Notice `warning`: "Let's start again with different words. Look at your paper first." with Button `primary` "Show phrase again" and Button `quiet` "Try again". New positions are drawn.
- Offline: works offline. Loading, Empty, Price unavailable, Relayer unavailable: not applicable.
- Locked mid-flow: not applicable, nothing is stored yet. If the app leaves the foreground the quiz stays where it was.

**Interactions and rules.**

- Three questions. Positions are drawn at random when an attempt starts and asked in ascending order. They stay the same for the whole attempt, including after "Show phrase again", so the help the user is given ("word 7") still applies when they come back.
- Each question shows four choices in random order: the answer plus three other words from the same phrase.
- A correct pick advances. The third correct pick goes to 2.8.
- Wrong picks are counted across the attempt. The third wrong pick restarts the attempt with new positions, so the quiz cannot be passed by elimination.
- "Show phrase again" returns to 2.3 with the grid concealed; "Continue" there returns to the same question.

**Disabled.** A chip that was picked wrongly, until the attempt restarts.

**Haptics.** Light impact on a correct pick. Error notification on a wrong pick. Success notification after the third correct pick.

**Accessibility.** The question is a heading and is announced when it changes. Each chip's label is the word. The hint is announced as an alert and names the position, never the word.

**Never shows.** The full phrase. The correct word after a miss. Capture-protected (3.6).

**Shared logic.** Build the phrase quiz.

---

### 2.5 Import: enter phrase

**Purpose.** Take a 12 or 24 word phrase and check it.

**Entry points.** "Restore a wallet" on Welcome. The reset path, after the wallet is wiped.

**Layout.**

1. Screen with a top bar: leading Back.
2. Text `display`: "Import an existing wallet."
3. Text `body` (dim): "Type or paste the 12 or 24 word recovery phrase. It stays on this phone and is checked against the Solana network only to find what it already holds."
4. Field, multiline, four lines tall, label "Recovery phrase", placeholder "word1 word2 word3 ...". Autocorrect, autocapitalise, spell check, predictive text and keyboard learning all off.
5. Text `caption` (faint), live: "12 or 24 words" when empty, otherwise "7 words".
6. Button `quiet`, text only: "Paste".
7. Button `primary`, full width: "Continue".

**States.**

- Empty: as above.
- Loading (after "Continue"): the form stays on screen exactly as it was. The field holds what was typed and is read-only; "Continue" is disabled and keeps its own label; a Button `quiet` "Cancel" appears next to it; the app's one top loader (3.11) runs under the status bar; and one quiet line sits under the button for as long as it runs: "Checking what this phrase holds. This can take up to a minute." Back stays available. After eight seconds a Text `caption` appears under the button: "Still working. A wallet with many portfolios takes a little longer." Cancel and Back return to the form with the phrase kept; what the lookup answers afterwards is ignored.
- Error, validation: Text `caption` (danger) under the field, once the field has been left, the keyboard closed or the button pressed, saying exactly what is wrong: "A recovery phrase is 12 or 24 words. This has 11.", "Word 7, \"abotu\", is not a recovery phrase word. Check its spelling." or "These are all real words, but together they are not a recovery phrase. Check that every word is the right one and in the right order."
- Error, network, going offline while it runs, or a lookup that has not finished after three minutes: back to the form with a Notice `danger`: "We couldn't finish importing your wallet. Nothing was saved on this phone. Try again."
- Offline: the button is disabled with Text `caption`: "You're offline. Nothing was saved on this phone. Go back online to import your wallet."
- Price unavailable, Relayer unavailable: not applicable.
- Locked mid-flow: not applicable. If the app leaves the foreground the field is cleared.

**Interactions and rules.**

- Input is read as people paste a phrase: capitals, commas, line breaks, tabs and the numbers of a numbered list only separate words. Exactly 12 or 24 words and a valid checksum are required. The return key submits; it never adds a line.
- "Paste" reads the clipboard once and fills the field. The clipboard is not read at any other time.
- A phrase can open two different sets of addresses, because wallet apps do not all turn a phrase into addresses the same way. Both sets are checked, each candidate address in a request of its own and in shuffled order, so the two sets are never named together.
- On success go to 2.6. When nothing was found under either set of addresses there is nothing to choose between: 2.6 is skipped, NoirWire's own set is opened, and 2.7 says "Nothing found yet. This phrase will open a new, empty wallet."

**Disabled.** "Continue" only while offline. For a phrase that is refused it stays pressable, and pressing it shows the reason.

**Haptics.** Error notification on a failed check. None while typing.

**Accessibility.** The field has a visible label and announces the word count at word boundaries, not per keystroke. At large text sizes the field grows in height.

**Never shows.** The phrase in a toast, a log or the app switcher. Any address. Capture-protected.

**Shared logic.** Parse a recovery phrase. Resolve an imported wallet.

---

### 2.6 Import: where did this phrase come from?

**Purpose.** Open the right set of addresses by asking a question the user can answer.

**Entry points.** From 2.5, always.

**Layout.**

1. Screen with a top bar: leading Back (returns to 2.5 with the phrase kept).
2. Text `display`: "Where did this phrase come from?"
3. Text `body` (dim): "A phrase can open two different sets of addresses, depending on the app that made it. Here is what each one holds."
4. Three Panels, each one tappable target, single select, 12pt apart:
   - Text `title` "NoirWire". Text `caption` (dim): what was found on chain for that set.
   - Text `title` "Another Solana wallet". Text `caption` (faint) "Such as Phantom or Solflare." Text `caption` (dim): what was found for that set.
   - Text `title` "Not sure". Text `caption` (dim): which set it will open, in words (see rules).
     What was found reads, by case: "Nothing found on chain yet", "2 portfolios", "Token balances", "2 portfolios and token balances".
5. Button `primary`, full width: "Open this wallet".

**States.** Populated only. Offline: the findings were read on the previous screen, so this screen works offline. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: not applicable.

**Interactions and rules.**

- When exactly one set shows anything on chain, that Panel is preselected and carries Text `caption` (safe): "This one has been used."
- "Not sure" opens the set that shows something on chain. When both do, or neither does, it opens the set most other wallets use, and its caption says so: "Opens the addresses most other wallets use. You can switch afterwards."
- "Open this wallet" goes to 2.7.

**Disabled.** "Open this wallet" until a Panel is selected.

**Haptics.** Light impact on selection.

**Accessibility.** Each Panel is one radio button whose label is its title followed by its captions.

**Never shows.** An address, in full or shortened. Derivation paths, or the words "scheme" or "derivation". Balances in the network's own currency.

**Shared logic.** Resolve an imported wallet.

---

### 2.7 Import: result

**Purpose.** Confirm what was found before a password is set.

**Entry points.** "Open this wallet" on 2.6, or straight from 2.5 when nothing was found.

**Layout.**

1. Screen with a top bar: leading Back.
2. Text `display`: "Wallet reunited with its funds." when anything was found, otherwise "Wallet imported."
3. Text `body` (dim): found: "Found 2 portfolios this phrase already had on chain." Not found: "Nothing found yet. This phrase will open a new, empty wallet."
4. Button `primary`, full width: "Continue" (to 2.8).
5. Button `quiet`, full width: "Open the other set instead" (back to 2.6). Not shown when 2.6 was skipped.
6. Button `quiet`, text only: "Show my funding wallet address". Tapped, the funding address appears beneath in groups of four characters, with "Hide". It is offered so a user can recognise their wallet; it is never shown unasked.
7. Button `quiet`, text only: "Missing a portfolio? Look further". It scans on from where the import stopped, past up to a hundred unused addresses in a row. While it runs: "Looking further for your portfolios..." with "Cancel"; "Continue" is disabled and the line under it says why: "Continue is paused while we look." The scan is paced to what the service allows one session, so it can run past a minute; the line and "Cancel" stay for as long as it does. Afterwards a line says "Found 2 more portfolios.", "No more portfolios were found for this phrase." or "We couldn't finish looking. Nothing was changed. Try again." It needs the network.

Recovered portfolios are named "Portfolio 1", "Portfolio 2" and so on; names live only on the device, so they cannot be recovered.

**States.** Populated only. Works offline. Loading, Empty, Error, Price unavailable, Relayer unavailable, Locked mid-flow: not applicable.

**Disabled.** Nothing. **Haptics.** Success notification on arrival when funds were found.

**Accessibility.** The headline is the heading. The address, once shown, is read in groups of four.

**Never shows.** An address before "Show my funding wallet address" is tapped. Capture-protected while the address is shown.

**Shared logic.** Create a wallet from a phrase.

---

### 2.8 Set password

**Purpose.** Choose the password that encrypts the wallet on this phone.

**Entry points.** After 2.4 (create) or 2.7 (import).

**Layout.**

1. Screen with a top bar: leading Back.
2. Text `display`: "Set a password"
3. Text `body` (dim), the rule, shown before anything is typed: "Choose a password of at least 12 characters. It locks the wallet on this phone. We never see it." The number is the store's own minimum (`newPasswordView`). The same line opens the new-password block in 2.30.
4. Field, secure, label "New password", with a trailing show or hide control. Above its trailing edge, Button `quiet` text only: "Suggest a passphrase".
5. Text `caption`, live, under the field: the strength line.
6. Field, secure, label "Confirm password".
7. Text `caption` (danger) under it when the two differ: "Both entries must match."
8. Text `caption` (faint), shown while the password is visible: "Write it down somewhere safe. It cannot be recovered, only replaced with your recovery phrase."
9. Button `primary`, full width: "Encrypt and finish".
10. Text `caption` (faint): "If you forget this password, your recovery phrase still opens your wallet. Without the phrase, nobody can."

**States.**

- Empty: no strength line.
- Populated: strength line is one of "Checking strength..." (faint), "Use at least 12 characters." (danger), "Too easy to guess. Use a few unrelated words, or tap Suggest a passphrase for a strong one." (danger), "Strong password." (safe).
- Loading (after the button): the button keeps reading "Encrypt and finish" (disabled) and both fields are read-only. Key derivation takes a moment on purpose; the app's one top loader (3.11) is the indicator, with the standard's "still working" line under the button if it runs long.
- Error: Notice `danger` "Could not encrypt the wallet. Try again." or "This phone would not save the wallet (storage is full or blocked). Nothing was changed."
- Offline: works offline. The strength dictionaries ship inside the app, so there is no network state here (the web app loads them on demand).
- Other states: not applicable.

Other states. Relayer unavailable, Price unavailable: not applicable. Locked mid-flow: not applicable, nothing is stored until this step succeeds; if the app leaves the foreground the fields are cleared.

**Interactions and rules.**

- At least 12 characters, and the strength estimate must reach the bar (about 10^12 guesses). The estimate knows leaked passwords, keyboard patterns, repeats and dates, and treats "noirwire", "wallet", "solana", "password", "crypto" and "stocks" as guessable.
- The strength line updates 200 ms after typing stops.
- "Suggest a passphrase" fills both fields with five random words joined by hyphens and switches the fields to visible, because a suggestion nobody saw cannot be written down.
- The system password manager may offer to save the password; the fields are marked as new-password fields.
- On success: the wallet is saved encrypted. For a created wallet the first portfolio is named "Investing". Then 2.9, or Home if 2.9 is skipped.

**Disabled.** "Encrypt and finish" is disabled until the password is strong and both entries match. The strength line or the mismatch line is the reason.

**Haptics.** Success notification when the wallet is saved. None on validation changes.

**Accessibility.** Fields have visible labels, not only placeholders. The strength line is a polite live region. The show or hide control is labelled "Show password" or "Hide password". The keyboard's return key moves from the first field to the second, and submits from the second when valid.

**Never shows.** The password in clear unless the user chose to show it. A strength meter bar (a sentence says more). Capture-protected while the password is visible.

**Shared logic.** Assess a password. Suggest a passphrase. Save the wallet under a password.

---

### 2.9 Create or import: enable biometric unlock

**Purpose.** Offer biometric unlock once, in one sentence, as a choice.

**Entry points.** After 2.8 succeeds, only if the device has biometrics enrolled. Skipped otherwise. Biometric unlock is opt-in: it is off until the user turns it on here or in Settings.

**Layout.**

1. Screen, no Back (the wallet is already saved).
2. The platform's biometric glyph, 40pt, ink.
3. Text `display`: "Unlock with Face ID?" (the name of the method on this device: Face ID, Touch ID, or "your fingerprint" or "your face" on Android).
4. Text `body` (dim): "Open NoirWire with Face ID instead of typing your password each time. Your password is still needed to view your recovery phrase and to change the password."
5. Button `primary`, full width: "Use Face ID".
6. Button `quiet`, full width: "Not now".

**States.**

- Populated: as above.
- Error: if the system prompt is cancelled or fails, stay on the screen with Notice `info`: "Face ID was not turned on. You can turn it on later in Settings."
- Offline: works offline.
- Loading, Empty, Price unavailable, Relayer unavailable: not applicable.
- Locked mid-flow: if the app locks here, Unlock is shown and this offer is not repeated; the Switch in Settings remains.

**Interactions.** "Use Face ID" shows the system biometric prompt and, on success, stores the wallet's key in the device keystore as described in 3.14. Either button then goes to Home.

**Disabled.** Nothing.

**Haptics.** Success notification when turned on.

**Accessibility.** The method is named exactly as the system names it. Both buttons are reachable without scrolling at default text size.

**Never shows.** A claim that biometrics replace the password. A second ask later: this offer is made once.

**Shared logic.** Turn biometric unlock on.

---

### 2.10 Unlock

**Purpose.** Open the stored wallet.

**Entry points.** Cold start with a wallet. Return from the background after more than 15 minutes. Idle lock after 15 minutes without input. "Lock now" in Settings.

**Layout.**

1. Screen, no tab bar, no Back.
2. Mark, 40pt. 32pt space.
3. Text `display`: "Unlock NoirWire"
4. Text `body` (dim): "Your wallet is stored encrypted on this phone, so it has to be unlocked each time the app opens."
5. Field, secure, label "Password", focused when biometric unlock is off.
6. Button `primary`, full width: "Unlock".
7. Button `quiet`, full width, when biometric unlock is on: "Use Face ID".
8. Divider. Text `caption` (faint): "Forgotten the password? It cannot be recovered. It never left this phone. Reset the wallet and import it again from your recovery phrase." followed by Button `quiet` text only: "Reset this wallet".

**States.**

- Empty: as above. With biometric unlock on, the system prompt appears as soon as the screen is active, and the keyboard stays down until the prompt is dismissed.
- Loading: the button keeps reading "Unlock" (disabled) and the field is read-only. The app's one top loader (3.11) runs, with the standard's "still working" line under the button if it runs long.
- Error, wrong password: Text `caption` (danger) under the field: "That password does not match this wallet." What was typed is kept and selected, so one keystroke replaces it and a slip is corrected without typing it all again (`unlockProblemView`). The field is never cleared by a failed unlock.
- NoirWire cannot be reached (2.0): Notice `info` above the field, "Can't reach NoirWire. Check your connection and try again." with Button `quiet` "Try again". The form works as usual.
- Error, biometric failed or cancelled: no message; the password field takes focus. After the system locks biometrics out, Notice `info`: "Face ID is unavailable right now. Enter your password."
- Error, biometrics changed on the device (a face or fingerprint was added or removed): the stored key is no longer usable (3.14), biometric unlock is off, and Notice `info`: "Face ID settings changed on this phone, so it was turned off for NoirWire. Enter your password." After the password unlock succeeds, one inline offer appears on Home: "Turn Face ID unlock back on?" with Button `quiet` "Turn on" and a close X.
- Pending action from before the lock: settled after unlock and before any Confirm for the same portfolio is enabled (3.3).
- Error, unreadable record: Notice `danger`: "The wallet stored on this phone cannot be read. Reset it and import it again from your recovery phrase."
- Error, address mismatch: Notice `danger`: "The addresses stored for this wallet do not match its recovery phrase, so it was not opened. Reset the wallet and import it again from your recovery phrase."
- Offline: unlocking works offline. The offline banner appears once inside.
- Other states: not applicable.

Other states. Relayer unavailable, Price unavailable: not applicable. Locked mid-flow: this screen is the lock.

**Interactions and rules.**

- There is no attempt counter and no timed lockout. The password's strength is the protection, which is why onboarding enforces it.
- After a successful unlock the user returns to where they were (section 3.4) or to Home.
- "Reset this wallet" opens 2.11.

**Disabled.** "Unlock" is disabled while the field is empty.

**Haptics.** Error notification on a wrong password. Success notification on unlock.

**Accessibility.** The field is labelled. The error is announced as an alert. "Use Face ID" names the device's method. The reset paragraph and its button are last in reading order.

**Never shows.** Anything about the wallet: no balance, no portfolio name, no address, no count of portfolios, no last-opened time. A locked phone knows only that a wallet exists.

**Shared logic.** Unlock the wallet with a password. Unlock the wallet with biometrics.

---

### 2.11 Reset wallet (from Unlock and from Settings)

**Purpose.** Delete the wallet from this phone, with a typed confirmation.

**Entry points.** "Reset this wallet" on Unlock. Settings, Danger zone.

**Layout.**

1. Screen (pushed from Settings) or full screen with a leading Back (from Unlock).
2. Text `display`: "Reset wallet"
3. Notice `danger`: "This deletes the wallet from this phone. Your recovery phrase is the only way back in. Without it, everything in your funding wallet and in every portfolio is gone for good, and nobody can restore it."
4. Field, label "Type RESET to confirm". Autocapitalise all characters, autocorrect off.
5. Button `danger`, full width: "Delete this wallet".
6. Button `quiet`, full width: "Cancel".

**States.** Populated only. Offline: works offline. Locked mid-flow: from Settings, a lock returns to Unlock and the typed word is discarded.

Other states. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable.

**Interactions and rules.**

- The button enables only when the trimmed input is exactly RESET.
- On confirm the stored record, the biometric unlock key, the watchlist, activity history and every on-device preference except the analytics choice are erased. Then Welcome.
- No system alert is added on top: typing the word is the confirmation.

**Disabled.** "Delete this wallet" until RESET is typed. The field label is the reason.

**Haptics.** Warning notification when the screen opens. Heavy impact on delete.

**Accessibility.** The notice is read before the field. The danger button's label is "Delete this wallet", not "Confirm".

**Never shows.** A way to export the phrase from the locked state. A count or value of what will be lost when entered from Unlock (the wallet is locked, so it is not known).

**Shared logic.** Wipe the wallet.

---

### 2.12 Home

**Purpose.** Show everything in one place, while each portfolio visibly stands on its own.

**Entry points.** Home tab. After unlock.

**Layout (wallet with money), on a 390pt wide screen.**

1. Screen, scrollable, pull to refresh. Top bar, 52pt: Mark and the wordmark "NoirWire" leading; a lock icon button trailing ("Lock wallet").
2. Balance block, about 130pt, unbordered and type-led (no Panel around it):
   - Text `caption` (faint): "Total value"
   - Money `display`, 42pt: for example "$8,729.89". The digits do not animate when the value changes; they are replaced.
   - One line: Delta, then Text `caption` (faint) "held trackers · 24h approximate".
   - Button `quiet`, text only, caption size: "Only you see this total". It opens an inline explanation that expands under the block: "This total is added up on this phone. Nothing on chain ties your portfolios to each other or to your funding wallet, and NoirWire's server never receives the sum." Tapping again collapses it.
3. One Row, 48pt: "Cash available to invest" · Money. When any portfolio has money in Earn, a second Row, 48pt, tappable to the Earn tab: "Earning" · Money. There are no side-by-side statistic tiles: three tiles do not fit 390pt without a fourth, smaller type size.
4. Actions row, 52pt, two buttons of equal width: Button `primary` "Find trackers" (goes to the Markets tab) and Button `quiet` "Add money".
5. 32pt space. Section heading Text `title` "Portfolios" with a trailing Button `quiet` "New".
6. One Row per active portfolio, 82pt tall, not cards and not a pager: IdentityMark (the user's glyph in its tint), name (Text `body`), and under it one useful line in Text `caption` (faint): "$96.18 cash · 4 holdings", or "Pie · 4 trackers · $96.18 cash", or "No investments yet". Trailing: Money, with a Delta caption under it.
7. Row "Archived portfolios (2)", collapsed. Expanded, archived portfolios appear dimmed with a trailing Button `quiet` "Restore".
8. Below the fold. Section heading "Your investments". One Row per tracker held across all portfolios, 64pt: IdentityMark, "NVIDIA tracker", caption "NVDAx · 5.1075 tokens", trailing Money. Tapping pushes Tracker detail. The combined list exists only on this screen, for the same reason as the total.
9. Section heading "Recent activity" with trailing Button `quiet` "See all". The three most recent Activity rows (as 2.22).

The watchlist and market shelves that sit on the web home live in the Markets tab on the phone.

**Layout (empty wallet).** When Total value, Earn balances and the funding wallet are all zero, the screen leads with the balance and one way to bring money in:

1. Balance block as above, reading "$0.00", with no Delta line and no signature arc: the arc is a share of something, and at zero there is nothing to draw (`showArc`). The Row under it reads "Ready to invest" · "$0.00".
2. One Button `primary`, full width: "Add money". It opens the add-money sheet (2.15a). There is no second button and no separate control for the address.
3. One line under it, Text `note`: "Your money arrives in your funding wallet. Then you move it into a portfolio."
4. The Portfolios section follows as usual. "Find trackers" is offered as a Button `quiet`, text only, under the list: "Look at trackers first".

**Layout (money waiting in the funding wallet).** A Notice `info` sits directly under the balance block: "$250.00 USDC has arrived in your funding wallet. Move it to a portfolio before buying." with Button `primary` inside it: "Move to Investing" (the first active portfolio). In this state it is the screen's one primary button, and both buttons in the actions row render as `quiet`.

**States.**

- Loading: Skeleton for the total, the cash line and three portfolio rows. Stored balances from the last session render immediately when present; the skeleton is only for a first load.
- Empty: the empty wallet layout, balance first. With no portfolios at all, the portfolio list is EmptyState: "Create a portfolio to start investing." with Button `quiet` "New portfolio". "Your investments" with nothing held: Text `caption` (faint) "No investments yet. Find a company or index tracker to get started."
- Populated: as above.
- Error (balances could not be refreshed): the last read values stay, and Text `caption` (faint) under the balance block: "Could not refresh. Pull down to try again."
- Offline: standard banner. Pull to refresh does nothing and the banner says why.
- Price unavailable: the total reads "Value unavailable" in `body` size, not `display`, with the caption "Waiting for current balances or market prices". The cash line still shows (USDC needs no price). A portfolio row whose holdings cannot all be priced reads "Value unavailable". No Delta is shown; the caption reads "No live day change available" when there are investments. An investment row reads "Price unavailable".
- Earn unreadable: the total excludes Earn and the caption reads "Excludes money in Earn, which could not be read yet". The "Earning" Row reads "Unavailable".
- Relayer unavailable: not surfaced on Home.
- After an action: when a money sheet closes from its result step, the values on this screen have already been read again (section 3.2).
- Locked mid-flow: standard.

**Interactions.**

- "Add money": if the funding wallet holds USDC, opens the move sheet (2.16). Otherwise opens the add-money sheet (2.15a).
- Portfolio row: pushes 2.13.
- "New": opens 2.14.
- "Restore": restores at once, with an inline line "Restored." under the row for two seconds.
- Lock icon: locks immediately, no confirmation.
- Pull to refresh re-reads the funding wallet and each portfolio, one address per request.

**Disabled.** Nothing.

**Haptics.** Light impact on pull-to-refresh release. None on value changes.

**Accessibility.** The total is read as "Total value, 8,729 dollars and 89 cents". The Delta is read as "up 98 dollars 79 cents, 1.2 percent, over 24 hours, approximate". Each portfolio row is one element: name, second line, value, change. Long numbers follow 3.8: the total scales down to fit one line and never truncates. At large text sizes the two action buttons stack.

**Never shows.** An address. Chain status or network names as the organising idea of the screen. A tracker logo standing in for a portfolio's identity: a portfolio is always its own glyph. A profit figure for tokens the app did not see bought. A stale price. A change of exactly zero in the loss colour (3.8). The network's own currency as a cost.

**Shared logic.** Summarise the wallet. Refresh funding balances. Refresh portfolio balances. Read each portfolio's Earn position. Read live prices.

---

### 2.13 Portfolio detail

**Purpose.** Show one portfolio: what it is worth, what it holds, and what can be done with it.

**Entry points.** A portfolio row on Home. A portfolio row inside Tracker detail or Earn. After creating a portfolio. After a fund, send or trade result.

**Layout.**

1. Screen, scrollable, pull to refresh. A 3pt line in this portfolio's tint runs along the very top edge of the screen, under the status bar (the identity line, section 3.9). Top bar: leading Back ("Home"), trailing icon button "Portfolio settings" (three dots).
2. Row: IdentityMark (large), Text `title` name, Text `caption` (faint) "Portfolio · Created 3 Sep 2026" or "Pie · Created 3 Sep 2026".
3. Text `caption` (faint): "Portfolio value"
4. Money `display`. Digits are replaced, not animated.
5. Text `caption` (dim): "457.33 USDC cash to invest". When money is in Earn, a second line, tappable to the Earn tab: "$120.00 earning through Jupiter Lend".
6. Action block:
   - One Button `primary`, full width, chosen by state: "Move to portfolio" when there is nothing to invest; "Invest" for a pie with cash; "Buy a tracker" for a plain portfolio with cash.
   - A row of up to three Button `quiet`, equal width: "Receive", "Send", and "Move to portfolio" (shown only when there is something to invest, since otherwise the primary already does it). For a pie whose mix has drifted, a Button `quiet` "Rebalance" goes on its own line above this row.
7. For a pie, section "Your mix" (heading with trailing Button `quiet` "Edit mix"):
   - PieRing, 120pt, smaller than on the web because the rows below carry the information. Centre label "Invested" with Money, or "Target" with "4 trackers" while nothing is held, or "Unpriced" when held but not priceable.
   - One row per slice: tone dot, IdentityMark, name, Text `caption` "Target 50% · Now 46.9%", trailing Money or "Not bought" or "Unpriced", and a trailing Button `quiet` "Sell" when held. Under the row, a 4pt bar filled to the current share with a tick at the target.
   - A slice 2 points or more away from its target is visibly distinct from one on target, by more than colour: the "Now" figure is in warning, and it is followed by the word "over" or "under" ("Now 46.9% · under"). A slice on target has neither.
8. Section "Holdings" (for a pie: "Cash and other holdings", excluding the slices above). One Row per holding with a balance, ordered cash first, then trackers by value:
   - Cash: IdentityMark, "Cash", caption "USDC", trailing "457.33 USDC".
   - Tracker: IdentityMark, "NVIDIA tracker", caption "NVDAx", trailing "5.1075 NVDAx" with Money caption under it, and Button `quiet` "Sell". Tapping the row body pushes Tracker detail. The company name comes first and the ticker second, everywhere.
   - Anything else the address happens to hold (for example SOL in an imported wallet) is an ordinary Row: its name, its amount, its value when it has a live price, and no action. Nothing on the phone explains, moves or spends it.
9. Section "Recent activity" with trailing "See all". Up to eight Activity rows for this portfolio.
10. Button `quiet`, full width: "See public view".

**Public view.** This replaces the web app's observer panel. It shows what someone who has this portfolio's address can see, as far as this phone knows it.

- What it is built from: only data the app already holds, which is the portfolio's address, its current holdings as last read, and this phone's own activity entries for this portfolio. Nothing is requested from, or sent to, any server to draw it.
- What it is not: a full on-chain history. The view says so in its own words (item 5 below). It does not fetch or reconstruct transactions made elsewhere.
- Entry: the visible "See public view" button is the primary entry. A long press on the portfolio's IdentityMark in item 2 is an enhancement that does the same thing; the feature must work completely without it.
- Transition: what exists only on this phone (the portfolio name, the IdentityMark, the action block, the Earn venue link) is masked out over 260 ms ease-out. If the masked transition cannot be built reliably on a platform, a plain 260 ms cross-fade to the public view is acceptable. With reduced motion on, the change is an instant cut.
- Content, top to bottom:
  1. Text `caption` (faint): "Public view"
  2. Text `body`: "Someone with this address can see these. Your other portfolios are not shown by this address."
  3. Row "Address" · "Hidden", with trailing Button `quiet` "Show". Shown, it is grouped in fours over two lines with Button `quiet` "Copy" beneath and "Hide".
  4. Section "Holdings": one Row per holding with its ticker and amount only ("5.1075 NVDAx", "457.33 USDC"). No names the user gave.
  5. Section "Transactions this phone knows about": the Activity rows recorded on this phone for this portfolio, with kind, amount and date. Text `caption` (faint) under the heading: "This is not the full history. Every transfer and trade on this address is public on chain, with its amount and time, including any made before this phone or outside this app."
  6. Panel "Not written on chain": three lines, "Your portfolio name", "Its relationship to your funding wallet", "Which other NoirWire portfolios you control". Then Text `caption` (faint): "These stay on this phone. Balance reads and trades are relayed by NoirWire's server, so the network provider, Jupiter and MagicBlock see this address but never your IP address. The relay stores and logs nothing; you have to trust it not to."
  7. Text `caption` (faint): "When NoirWire's relayer pays a network cost for this portfolio, that transaction names the relayer, so an observer can tell this address uses NoirWire. It does not name your funding wallet or your other portfolios."
  8. Notice `warning`: "Funding can still create a clue. Reusing a known address or moving a distinctive amount moments later may let an observer infer a connection."
  9. Button `primary`, full width, pinned at the bottom: "Back to my view".
- Exit: "Back to my view", the system back gesture, or releasing the long press when it was entered by holding. Leaving the screen or locking always exits it and hides the address again.

**States.**

- Loading: stored values render at once; a first load shows Skeleton for the value and four rows.
- Empty, plain portfolio: instead of the Holdings list, an EmptyState: a PieRing at 0 percent (an empty outline), Text `body` "Nothing here yet.", and Button `primary` "Add your first tracker". With nothing to invest the button reads "Move to portfolio", full width like a pie's, and the caption under it reads "Move money in first, then choose a tracker." In this state the action block's own primary button is not rendered, so one primary remains.
- Empty, pie: the ring shows the target mix as outlines at 0 percent invested, with centre label "Target" and "4 trackers", and the action block's primary reads "Invest" (or "Move to portfolio" with nothing to invest).
- Empty, activity: "Nothing has moved yet. Fund or receive into this portfolio to begin."
- Populated: as above.
- Error: "That portfolio does not exist." as an EmptyState with Button `quiet` "Back to Home" (a stale route after a reset or restore).
- Archived: the action block is replaced by a Panel: Text `title` "This portfolio is archived." Text `caption` "It stays visible and its history is kept, but it is hidden from the portfolio list." Button `primary` "Restore", Button `quiet` "Portfolio settings". No Sell buttons, no Edit mix.
- Offline: standard. The action buttons are disabled with the banner as the reason. Public view still works.
- Price unavailable: the value reads "Value unavailable"; a tracker row's Money caption reads "Price unavailable"; token amounts still show. When a tracker's amount cannot be shown truthfully (its multiplier could not be read) the amount reads "Unavailable" and Sell is disabled with caption "This token's balance cannot be shown right now. Try again in a moment."
- Relayer unavailable: not surfaced here; it appears in the action's review.
- Pending action: when this portfolio's last action has an unknown outcome, a Notice `warning` is pinned under the value with the pending text (section 3.3).
- After an action: the values here have been read again by the time a money sheet closes (section 3.2).
- Locked mid-flow: standard.

**Interactions.**

- Primary button: opens fund (2.16), pie order in invest mode (2.21), or trade in buy mode (2.20) with this portfolio already chosen.
- "Sell" on a holding: opens trade in sell mode for that tracker and this portfolio.
- "Rebalance" is offered only when every held slice has a live price and at least one slice is 2 points or more from its target.
- "Send" opens 2.24. "Receive" opens 2.15 for this portfolio.
- "Copy" on the address copies it and marks the clipboard entry as sensitive and local-only where the platform allows; the button reads "Copied" for two seconds.

**Disabled.**

- "Send" is disabled when the portfolio holds nothing. Reason, as Text `caption` under the Send button itself, in its own column and not under Receive: "Nothing to send yet."
- All actions are disabled while offline.

**Haptics.** Medium impact when the long press enters public view. Light impact on Copy. None otherwise.

**Accessibility.** Reading order: name, value, cash line, actions, mix, holdings, activity, "See public view". The long press has an equivalent button, and the IdentityMark exposes a custom action named "See public view". The PieRing has a text alternative listing each slice: "SP500, target 50 percent, now 46.9 percent, under target". Entering public view announces "Public view. Showing what someone with this address can see, as far as this phone knows." The full address, once shown, is read in groups of four characters. At large text sizes the quiet buttons stack vertically.

**Never shows.** The address, in full or shortened, without a tap. The funding wallet's address. Sibling portfolios, the combined total or local names inside public view. A link to a block explorer (it would hand the address to a third party in a URL). Profit on tokens that arrived from outside. A tracker logo used as the portfolio's identity.

**Shared logic.** Refresh one portfolio's balances. Read the portfolio's Earn position. Read pie state and whether it needs a rebalance. Read pending action state.

---

### 2.14 New portfolio and new pie (sheet)

Three rules sit on top of what follows. The create button can always be pressed and says what is missing ("Type a name first.", or the mix's own problem). "Type a name first." is dropped when the kind is switched between portfolio and pie, and the mix's problem is said once, by the mix editor. A name another portfolio already has, archived ones included, is refused as it is typed: "You already have a portfolio with that name. Choose another name."; renaming in Portfolio settings holds to the same. And once the wallet ends in ten portfolios in a row that were never used, no further one is created: "You have several portfolios that were never used. Use one of those first. An archived one can be restored.", because one made past them could be out of reach of an import.

**Purpose.** Create a portfolio, or a pie, with a name only the user sees.

**Entry points.** "New" on Home. "Create a portfolio" on Earn or Tracker detail when none exists.

**Layout.**

1. Sheet, title "New portfolio" or "New pie" following the choice below. Close X.
2. Segmented, two options: "Portfolio" and "Pie". Under it Text `caption` (faint), following the selection: "Buy one tracker at a time." or "Set a mix of trackers and invest in all of them at once."
3. Portfolio:
   - Text `body` (dim): "Give it a name only you see. The name never leaves this phone."
   - Field, label "Portfolio name", placeholder "Investing", 64 characters at most.
   - Chips: "Investing", "Long term", "Everyday". Tapping one fills the field.
   - Row "Icon and colour" with the current IdentityMark leading and trailing "Change". Expanded: a grid of 32 glyphs (six per row, 44pt cells) and a row of eight tints.
   - Button `primary`, full width: "Create portfolio".
4. Pie:
   - Text `body` (dim): "A pie is its own portfolio with its own address. Investing splits your money across the mix."
   - Field, label "Pie name", placeholder "Core".
   - Row "Icon and colour" as above. The default mark for a pie is its ring; when a glyph has been chosen, Button `quiet` "Use the pie ring" restores it.
   - The pie builder body (2.23, items 2 to 6).
   - Button `primary`, full width: "Create pie".

**States.** Loading: button reads "Creating portfolio..." or "Creating pie...". Error: Notice `danger` "The new portfolio could not be saved on this phone." Offline: works offline, a portfolio is derived on the device. Other states: not applicable. Locked mid-flow: standard, the draft is discarded.

Other states. Price unavailable, Relayer unavailable: not applicable; creating a portfolio prices nothing and sends nothing.

**Interactions and rules.** The name is trimmed; an empty name cannot be submitted. Duplicate names are allowed. On success the sheet closes and the new portfolio's detail is pushed.

**Disabled.** The create button while the name is empty, and for a pie while the mix has a problem (the problem line from 2.23 is the reason).

**Haptics.** Light impact on segment change and on chip tap. Success notification on creation.

**Accessibility.** Each glyph cell is labelled with its name ("Compass icon"); each tint with its name ("Teal colour"). The glyph grid and tint row are each one radio group.

**Never shows.** The new address. A cost: creating a portfolio moves nothing on chain.

**Shared logic.** Add a portfolio. Add a pie.

---

### 2.15a Add money (sheet)

**Purpose.** Tell someone who has never held USDC how to bring money in, in three steps, with the address they need already in front of them.

**Entry points.** "Add money" on an empty Home, in Settings, Funding wallet, in the move sheet when the funding wallet is empty, and on a buy with nothing to invest anywhere (2.20).

**Layout.** Drawn from `addMoneyView(wallet)`.

1. Sheet, title "Add digital dollars". Close X.
2. Step 1, "Get USDC": "USDC is a digital dollar: 1 USDC = $1. NoirWire cannot take card payments yet. Buy USDC in any app or service that can send it on the Solana network. No account with us is needed."
3. Step 2, "Send it to your funding wallet": "Copy the address below. In the other app choose USDC and the Solana network, and check the address before sending. This transfer is public." Under it, in a Panel: the funding wallet address in groups of four over two lines, shown as the sheet opens with nothing to tap first; Text `caption` (faint) "Network: Solana"; Button `primary` "Copy address".
4. Step 3, "Move it into a portfolio": "When it arrives, choose a portfolio and tap Move to portfolio. A private move is not linked to your funding wallet in the public record." followed by what it costs and how long it takes, both read from the constants the review charges by.
5. Button `quiet`: "What does it cost?" It closes the sheet and opens Costs (2.31a).

No service is named anywhere on the sheet.

**States.** Populated only; it works offline. **Haptics.** Light impact on copy.

**Accessibility.** The sheet's title and the three step titles are headings. The address is read character by character. Copy is labelled "Copy funding wallet address".

**Capture.** This is the one wallet surface that may be captured: the address is the person's own and is what they give to another service (`captureAllowed`). Every other protected surface stays protected (3.6).

**Shared logic.** `addMoneyView`.

---

### 2.15 Receive (sheet)

**Purpose.** Show one portfolio's address, as text and as a QR code, with the one warning that applies to it.

**Entry points.** "Receive" on Portfolio detail (that portfolio). The funding wallet's own address is in the add-money sheet (2.15a).

**Layout, portfolio.**

1. Sheet, title "Receive in [name]". Close X.
2. Notice `warning`: "A transfer straight to this address is public and ties the sender to this portfolio. To move in your own money, use Move to portfolio instead."
3. QRCode. 4. Address. 5. "Copy address".
4. Text `caption` (faint): "[name]'s own address on Solana, derived from your recovery phrase. Only send Solana assets to it. Funds sent from another network are lost."

**States.** Populated only. Offline: works offline. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: the sheet closes on lock and does not reopen after unlock.

**Interactions.** "Copy address" copies, reads "Copied" for two seconds, and the clipboard entry is marked sensitive and local-only where the platform allows. There is no Share button: the system share sheet would hand the address to whichever app is picked, and offers suggestions built from it.

**Disabled.** Nothing.

**Haptics.** Light impact on copy.

**Accessibility.** The QR code is labelled "QR code of your funding address" (or the portfolio's). The address text is selectable and read in groups of four. Screen brightness is not changed.

**Never shows.** Both addresses on one sheet. The address in the sheet's route. A Share action. The address in the app switcher: this sheet is behind the privacy cover like every screen, and is also capture-protected.

**Shared logic.** Read the funding address. Read a portfolio's address.

---

### 2.16 Move to portfolio (sheet)

**Purpose.** Move USDC from the funding wallet into one portfolio without publishing a transfer between the two.

**Entry points.** "Move to portfolio" on Portfolio detail. "Move to [name]" and "Add money" on Home once USDC is waiting. "Move to portfolio" inside the trade sheet when the portfolio has nothing to invest and USDC is waiting (the trade sheet closes first).

**Step 1, amount.**
When the sheet is opened from Home with more than one active portfolio, it starts with a portfolio step: title "Choose a portfolio", one Row per active portfolio (IdentityMark, name, cash), and Button `primary` "Continue with [name]" for the selected row. Opened from a portfolio, that step is skipped.

1. Sheet, title "Move to portfolio", with the identity line and header mark of the receiving portfolio (section 3.9). Close X.
2. Text `body` (dim): "Move USDC into [name] without publishing a transfer between your funding wallet and it."
3. Row "Available in funding wallet" · "500.00 USDC".
4. Field, numeric decimal keyboard, large, label "Amount in USDC", placeholder "0.00".
5. Chips, inline, unfilled: "10", "25", "50", "100". A chip is disabled when its amount plus fees is more than the funding wallet holds.
6. The cost, as plain arithmetic in a Panel, updating as the amount changes. It is always visible, never behind a tooltip or an info icon:
   - "Arrives in [name]" · "100.00 USDC"
   - "Privacy fee, 0.1% of the amount" · "+ 0.10 USDC"
   - "Relay fee, flat" · "+ 0.20 USDC"
   - Divider
   - "Leaves your funding wallet" · "100.30 USDC"
     Before an amount is typed the right-hand values read "0.00 USDC", "+ 0.00 USDC", "+ 0.20 USDC", "0.20 USDC".
7. Text `caption` (faint): "Both fees are charged in USDC by the settlement service, on top of the amount. The relay fee pays the network cost. The smallest transfer is 0.50 USDC, and it usually arrives within seconds."
8. Button `primary`, full width: "Review".
9. Divider. Text `caption` (faint): "A private transfer breaks the on-chain link between your funding wallet and this portfolio. It does not hide the amount, and the settlement service sees both addresses. It does not see your IP address: the request is relayed by NoirWire's server, which stores and logs nothing. Privacy from the chain, not from the service."

**Step 2, review.** Title "Review". Back returns to step 1 with the amount kept.

1. Text `body` (dim): "Review what leaves your funding wallet before moving money into [name]."
2. Panel of Rows:
   - "Arrives in [name]" · "100.00 USDC"
   - "Privacy fee (0.1%)" · "0.10 USDC"
   - "Relay fee" · "0.20 USDC"
   - Divider
   - "Total leaving your funding wallet" · "100.30 USDC" (Text `title` weight)
3. Text `caption` (faint): "If the transfer would take more than this total, it is not signed."
4. Button `primary`, full width: "Confirm".

Amounts on the review are exact, to as many decimals as are non-zero up to six, never rounded to cents.

**Step 3, progress.** Title "Moving 100.00 USDC into [name]". No close, no Back. StepList:

1. "Private move sent" · caption "Signed by your funding wallet and handed to the settlement queue."
2. "Waiting in the queue" · caption "Delivered after 2 to 15 seconds, split across several entries."
3. "Arrived in [name]" · caption "Confirmed by reading this portfolio's real balance."

**Step 4, result.**

- Arrived: Text `display` "Funds arrived". Text `body` (dim): "100.00 USDC is now in [name], read back from its real balance. 0.30 USDC in fees was charged on top." Button `quiet`, text only: "See public view" (closes the sheet and opens the portfolio's public view, 2.13). Button `primary`: "Done", which closes the sheet to the updated screen.
- Still settling: Text `display` "Still settling". Text `body` (dim): "The transfer was accepted but has not landed yet. Queued transfers settle on their own schedule, so this is normal rather than a failure. This portfolio's balance will show it once it arrives." Button `primary`: "Close".
- Unknown: Text `display` "Sent, but not confirmed". Text `body` (dim): "The transfer of 100.00 USDC was sent, and the answer never came back. It may still arrive. Do not send it again yet: check your funding wallet's USDC balance first. If it has gone down, the money is on its way to [name] and needs nothing more from you." Button `primary`: "Close". The fund sheet cannot be reopened for any portfolio until the funding wallet's balance has been read again successfully.

**States.**

- Loading: the available balance shows a Skeleton until the funding wallet has been read on open.
- Empty (funding wallet holds no USDC): the Field, chips and Review are replaced by EmptyState: "Your funding wallet is empty." with Button `primary` "Show my funding address" (closes this sheet, opens Receive).
- Error: failure before anything was sent returns to step 1 with a Notice `danger` carrying the reason, for example "The private transfer could not be started." or "The private transfer did not go through." A refusal by the pre-signing check is shown verbatim, for example "This transfer would name one of your portfolios on chain next to your funding wallet. Not signed."
- Offline: Review and Confirm are disabled; standard banner.
- Price unavailable: not applicable, USDC needs no price.
- Relayer unavailable: not applicable. This transfer's network cost is met by the settlement service's relay fee, not by NoirWire's relayer. If the settlement service cannot be reached: Notice `warning` on step 1 or 2: "This can't be done right now. Nothing was charged. Please try again in a few minutes."
- Locked mid-flow: before Confirm, the sheet closes and the amount is discarded. After Confirm, see 3.4: the transfer has been handed over and settles without the app; on unlock the portfolio's balance is read again.

**Validation, in the order checked, shown as Text `caption` (danger) under the Field once it has a value.**

1. Not a finite number above zero, or more than the funding wallet holds: "Enter an amount greater than zero and within your available balance."
2. Below the minimum: "A private transfer has to be at least 0.50 USDC."
3. Amount plus fees is more than the funding wallet holds: "With fees this takes 500.50 USDC from your funding wallet, more than it holds. Enter a smaller amount."

Fee arithmetic: privacy fee = 0.1% of the amount; relay fee = 0.20 USDC flat; total = amount + privacy fee + relay fee, computed in the token's base units.

**Disabled.** "Review" until the amount passes all three checks; the validation line is the reason. Chips as noted.

**Haptics.** Light impact on chip tap. Medium impact on Confirm. Success notification on arrival. Warning notification on still settling and on unknown.

**Accessibility.** The Field announces "Amount in USDC". The review Panel is read row by row, label then value, and the total is announced as "Total leaving your funding wallet, 100 point 30 USDC". Each StepList item announces its status change ("Waiting in the queue, done"). At large text sizes each review Row stacks label over value.

**Never shows.** The word "private" for anything that is not this route. Either address. A claim that the amount is hidden. The network's own currency.

**Shared logic.** Refresh funding balances. Work out the cost of a private transfer. Start a private transfer. Wait for a private transfer to arrive.

---

### 2.17 Portfolio settings (sheet)

**Purpose.** Rename a portfolio, change its mark, or archive it.

**Entry points.** The three-dot button on Portfolio detail. "Portfolio settings" on an archived portfolio.

**Layout.**

1. Sheet, title "Portfolio settings". Close X.
2. Field, label "Portfolio name", prefilled, 64 characters at most.
3. Row "Icon and colour" with "Change", as 2.14.
4. Button `primary`, full width: "Save".
5. Divider. Text `title`: "Archive this portfolio" (or "Restore this portfolio"). Text `caption` (dim): "It disappears from the portfolio list. Nothing is deleted and you can restore it at any time."
6. Button `quiet`, full width: "Archive" (or "Restore").

**States.** Populated only. Works offline. Locked mid-flow: standard.

Other states. Loading, Error, Price unavailable, Relayer unavailable: not applicable; nothing here touches the network.

**Interactions and rules.**

- Save applies the name and the mark and closes the sheet.
- Archive needs no second confirmation: it is reversible and moves nothing. If the portfolio still holds value, a Notice `info` sits above the Archive button: "This portfolio still holds $1,842.60. Archiving hides it; it does not move anything."
- An archived portfolio cannot trade, send, receive, be funded or use Earn until restored. Its balances are still counted where they are shown.
- There is no delete: a portfolio is an address derived from the phrase and cannot stop existing.

**Disabled.** "Save" until the trimmed name is not empty and either the name or the mark has changed.

**Haptics.** Light impact on Save. Light impact on Archive and Restore.

**Accessibility.** As 2.14 for the picker. The archive explanation is read before its button.

**Never shows.** A Delete action. The address.

**Shared logic.** Rename a portfolio. Set a portfolio's mark. Archive or restore a portfolio.

---

### 2.18 Markets

**Purpose.** Find a tracker.

**Stale prices.** When prices could not be read or have aged out, one quiet line sits above the shelves: "We couldn't update prices. What you see may be out of date." It is the notice Home has for balances, and it does not show over a first load.

**Entry points.** Markets tab. "Explore trackers" (visitor mode, 2.2). Deep link.

**Layout.**

1. Screen, scrollable. Top bar title "Markets".
2. Field, search style with a leading magnifier, placeholder "Company or ticker", label "Search trackers", with a clear control once it has text.
3. While not searching:
   - Section per shelf, each a heading Text `title` and a horizontally scrolling row of cards (152pt wide): IdentityMark, name, ticker caption, Money, Delta. Shelves in order: "Top movers" (with trailing caption "24h change"), "Funds and ETFs", "Companies", "My watchlist". Six cards at most per shelf, except the watchlist which shows all. A shelf with nothing in it is omitted.
   - Section "Browse all": Chips "All", "Companies", "Funds and ETFs", "My watchlist" (single select), then a list of tracker Rows, 25 at a time, with Button `quiet` "Show 25 more" (or the remaining count) at the end.
4. While searching: Text `caption` (faint) "12 results", then tracker Rows.

Tracker Row, 72pt: IdentityMark with a small safe dot when the price is live; name (Text `body`), caption "NVDAx · xStocks"; a 1D sparkline (Chart, compact, coloured safe or danger by the day's direction, hidden below 360pt width and at large text sizes); trailing Money with Delta under it; a star icon button.

**States.**

- Loading: Skeleton cards and eight Skeleton rows on first load. Sparklines load only for rows on screen and simply appear when ready.
- Empty, search: "No matching investment." Empty, watchlist filter: EmptyState "Your watchlist is empty." with Text `caption` "Tap the star on a tracker to save it here." Empty, movers before prices load: Text `caption` (faint) "Top movers appear when current prices load."
- Populated: as above.
- Error: prices could not be read. Rows still list (the catalog ships in the app) in the price unavailable state.
- Offline: standard banner; rows in the price unavailable state.
- Price unavailable: Money reads "At review" and the Delta is replaced by Text `caption` (faint) "No live price". No sparkline tint. A price counts as live for two minutes after the last successful read; after that it is removed, not greyed.
- Relayer unavailable: not applicable.
- Locked mid-flow: standard.

**Interactions and rules.**

- Search matches the ticker, the name, and the ticker without its trailing "x" ("nvda" finds NVDAx). It filters as the user types. The typed text is never sent anywhere or counted.
- Tapping a row or card pushes Tracker detail.
- The star toggles the watchlist. It gives a light impact and no toast.
- Prices refresh every 30 seconds while the screen is focused.
- Retired trackers (no longer offered to buy) are not listed here.

**Disabled.** Nothing.

**Haptics.** Light impact on chip selection and on the star.

**Accessibility.** Each row is one element: "NVIDIA, NVDAx, 235 dollars 91 cents, up 2.21 percent today". The star is a separate button: "Add NVDAx to watchlist" or "Remove NVDAx from watchlist". Sparklines are decorative and hidden from assistive technology. At large text sizes the price moves under the name.

**Never shows.** A stale price. The word "stocks" as a category. A Buy button in the list.

**Shared logic.** Read live prices. Search the catalog. List trackers by category. Rank top movers. Toggle the watchlist. Read price history.

---

### 2.19 Tracker detail

**Purpose.** Show one tracker's price, and what the user holds of it.

**Entry points.** A row or card in Markets. A holding row in Portfolio detail. A pie slice. After a trade result. Deep link.

**Layout.**

1. Screen, scrollable. Top bar: leading Back; trailing star icon button.
2. Row: IdentityMark, Text `title` name ("NVIDIA", the page's heading), Text `note` "NVIDIA tracker · NVDAx".
3. Text `body` (dim): "Follows NVIDIA's share price. You do not own a share." These three lines are the first things on the page.
4. Money `display`, generous (42pt): the live price per token, with Text `caption` (faint) "Approximate price" on the same baseline, trailing. Then Delta and Text `caption` (faint) "past 24h".
5. Text `caption` (faint): "The final price is shown before you buy." When prices could not be read or have aged out, a second quiet line: "We couldn't update prices. What you see may be out of date."
6. Chart, about 220pt tall. A single restrained stroke, in safe when the range ended higher than it started, danger when lower, and dim when it ended exactly where it started; a faint fill beneath. Press and hold (a quarter of a second, so a scroll that starts on the chart still scrolls) marks the nearest point with a hairline and shows its price and date in a line above the plot for as long as the finger is down; dragging moves it. A month's points show a date, the shorter ranges a date and a time (`chartReadout`).
7. Directly under the plot, one row: "High $236.20", "Low $229.90", the range's high and low, and trailing Text `caption` (faint) "Historical prices".
8. Segmented, below the plot: "1D", "1W", "1M". These are the only ranges the price source provides; no longer range is offered.
9. Section "Your holding":
   - Text `title` quantity: "5.1075 NVDAx". Text `caption` (faint): "$1,204.82 approximate value".
   - One Row per portfolio that holds it: portfolio name · quantity. Tapping pushes that portfolio.
   - When nothing is held: Text `caption` (faint) "You do not own this tracker yet."
10. Section "About and risk":
    - Text `body` (dim): "NVDAx is an xStocks tracker certificate that follows NVIDIA. It is not a direct company or ETF share and gives no voting rights."
    - Text `body` (dim): "Trades, amounts and timing are visible on chain."
    - Text `body` (dim): "Dividends are not paid out. The issuer reinvests them, so the balance shown here grows instead. Stock splits change the balance the same way."
    - Text `caption` (faint): "xStocks are not offered in the United States, to US persons or in the issuer's prohibited countries."
    - Button `quiet` text only: "Read the risks". It opens in place: first "The company that issues this tracker can freeze or remove it.", then the Risks text (2.34). What the issuer can do is said here and not in the main column.
    - Button `quiet` text only: "Read issuer details" (opens the issuer's FAQ in the system browser; the link carries nothing about the user).
11. Bottom bar, pinned above the tab bar and staying put while the page scrolls: Text `caption` (faint) "The smallest order is about $10.", the figure the trade sheet holds an order to; then Button `primary` "Buy", 56pt tall, and, when any active portfolio holds this tracker, Button `quiet` "Sell" beside it.

**States.**

- Loading: price Skeleton; chart area shows Text `caption` (faint) "Loading price history...".
- Empty (chart): "Chart unavailable right now." No placeholder line is drawn.
- Populated: as above.
- Error: unknown symbol: EmptyState "No such investment." with Button `quiet` "Back to Markets".
- Offline: standard banner; price unavailable state; Buy and Sell disabled.
- Price unavailable: the price reads "At review" in `body` size with Text `caption` (faint) "Current price unavailable" and no "Approximate price" tag; line 5 keeps "The final price is shown before you buy." and adds the stale line; the holding caption reads "Value available when a current price loads". Buy and Sell stay enabled: an order is priced by its own live quote.
- Retired tracker: Notice `warning` in the About section: "NVDAx is no longer offered to buy here. What you hold can still be sold or sent." The bottom bar shows only "Sell" when held; when not held it shows Text `caption` (faint) "No longer offered to buy."
- No portfolio exists: the bottom bar shows Button `primary` "Create a portfolio" (opens 2.14).
- Relayer unavailable: not surfaced here.
- Locked mid-flow: standard.

**Interactions.** "Buy" opens the trade sheet (2.20) in buy mode for this tracker, starting at its choose-portfolio step with the portfolio last opened preselected; the step is skipped when there is only one active portfolio. "Sell" opens it in sell mode, where the choose-portfolio step lists only the portfolios that hold this tracker, and is skipped when only one does.

**Disabled.** Buy and Sell while offline, with the banner as the reason.

**Haptics.** Light impact on range change and on each crosshair point change (selection feedback), none if reduced motion is on.

**Accessibility.** The chart has a text alternative: "1 day price chart. Started at 230 dollars 70 cents, now 235 dollars 89 cents, up 2.24 percent." The crosshair is not the only way to read values. The bottom bar buttons come before the About section in focus order so they are reachable without scrolling the whole page. At large text sizes Buy and Sell stack.

**Never shows.** A drawn chart from made-up or stale data. A profit figure for tokens the app did not see bought. "Share" as an unqualified word.

**Shared logic.** Read live prices. Read price history for a range. Read the position across portfolios. Toggle the watchlist.

---

### 2.20 Trade (sheet)

**Purpose.** Buy or sell one tracker in one portfolio, at a price the user has seen.

**Entry points.** "Buy" and "Sell" on Tracker detail. "Buy a tracker" and "Add your first tracker" on Portfolio detail. "Sell" on a holding or a pie slice.

The sheet is a sequence of steps, each with exactly one primary action. Buying is described; selling differs only where noted.

**Step 1, choose portfolio.** Skipped when the sheet was opened from a portfolio, or when only one portfolio qualifies.

1. Sheet, title "Buy NVIDIA tracker" (or "Sell NVIDIA tracker"). Close X.
2. Text `body` (dim): "Which portfolio buys it?" (sell: "Which portfolio sells it?")
3. One Row per active portfolio, 64pt, single select: IdentityMark, name, and trailing "457.33 USDC available" (sell: "5.1075 NVDAx held"; only portfolios that hold the tracker are listed).
4. Button `primary`, full width: "Continue with Investing" (the selected portfolio's name).

On Continue the chosen portfolio's glyph travels into the sheet header (220 ms) and the identity line takes its tint. From here every step carries that header mark and line, so it is always clear which portfolio pays.

**Step 1b, choose tracker.** Only when the sheet was opened from a portfolio without a tracker.

1. Title "Buy a tracker". Field, search style, placeholder "Company or ticker", label "Tracker".
2. Up to six Rows, deepest markets first until something is typed: IdentityMark, name, trailing ticker. Tapping a row selects it and moves on; this step has no primary button because the tap is the action.
3. Text `caption` (faint): "42 more. Type a name or ticker to narrow it down." or "No matching investment."

**Step 2, amount.**

1. Header: portfolio mark and name; under it Row: tracker IdentityMark, "NVIDIA tracker", caption "NVDAx · xStocks".
2. Segmented: "Dollars" and "NVDAx tokens". Buying starts on Dollars, selling on tokens.
3. Field, numeric decimal keyboard, very large (the screen's `display` size), placeholder "0.00", label "Spend, in dollars" (or "Receive about, in dollars" when selling in dollars; "NVDAx tokens" in tokens).
4. Button `quiet`, text only, trailing the field: "Max" (sell: "Sell all").
5. Row "Available" · "457.33 USDC" (sell: "5.1075 NVDAx").
6. Row "Estimate" · "0.4239 NVDAx" with Text `caption` (faint) "Approximate price" beside it (sell in tokens: the dollar estimate).
7. Text `caption` (faint): "The smallest order is about 12 USDC. Your order price is shown at review."
8. Button `primary`, full width: "Review buy" (sell: "Review sell").

**Step 3, review.** Back returns to step 2 with the amount kept. Four things stay visible without scrolling at default text size: what is spent, the minimum received, the total cost, and how long the price is held.

1. Two lines, the first in Text `title`, the second in `body`: "Spend $100.00 from Investing" above "Receive at least 0.4215 NVDAx". (Sell: "Sell 0.4239 NVDAx from Investing" above "Receive at least $99.20".)
2. Text `caption` (faint), a countdown that changes once a second without animating: "Price held for 24 seconds."
3. Panel of Rows:
   - "You expect to receive" · "0.4239 NVDAx"
   - "Price for this order" · "$235.91 per NVDAx"
   - "Fee" · "0.50% · about $0.50" (the fee the live quote carries; NoirWire's part is named in the explanation under the Panel)
   - "Network cost" · the figure (section 3.1)
   - Divider
   - "Total cost" · "100.00 USDC" (sell: "Total you receive, at least"). The fee is inside the quoted amounts; a network cost charged separately is added here.
4. The network cost reason line, when there is one (section 3.1): "The network cost includes opening this holding, a one-time cost."
5. Text `caption` (faint): "If this order would deliver less than the minimum, we will stop it. Quoted by [venue]. Of the fee, 0.50% is NoirWire's."
6. Buying only, one line, Text `caption` (dim): "NVDAx is a tracker, not a share, and its issuer keeps control over it." followed by Button `quiet`, text only: "Read the risks". It shows the Risks screen (2.34) as a step inside this sheet; Back returns to this review with the price countdown still running.
7. One line, Text `caption` (warning): "This portfolio's trades and holdings are public."
8. The pending note, when there is one (section 3.3).
9. Button `primary`, full width: "Confirm buy" (sell: "Confirm sell").

**Step 4, progress.** Title "Checking your purchase" (sell: "Checking your sale"). No close, no Back.

For an order in a holding that already exists, the StepList is:

1. "Placing the order"
2. "Reading the new balance"

A first buy of a tracker is two transactions under the one confirmation: the holding is opened through the relayer, then the order is priced and placed. The user sees them as two separate facts:

1. "Opening the holding for NVDAx". When it completes, the step is marked done and a Text `caption` (dim) appears under it and stays for the rest of the flow: "The holding is open. The network cost for that is already paid."
2. "Getting the price for your order"
3. "Placing the order"
4. "Reading the new balance"

From the moment step 1 is done, that network cost has been paid and cannot be returned, whatever happens to the order. Every later message says so.

**Step 5, result.** The result is a step in this sheet. Its one button closes the sheet to the updated screen underneath.

- Landed: Text `display` "Bought 0.4239 NVDAx". Text `body` (dim): "For $100.00, in Investing." Button `primary` "Done". (Sell: "Sold 0.4239 NVDAx" · "For $99.48, now in Investing's cash.")
- Landed, balance not read back: Text `display` "Order placed". Text `body` (dim): "The new balance could not be read yet and will appear shortly." Button `primary` "Done".
- Unknown: Text `display` "Sent, but not confirmed". Text `body` (dim): "This was sent but could not be confirmed. It may still go through. Check Investing's balance before trying again." Button `primary` "Close". There is no retry control. Section 3.3 then applies to this portfolio.
- Failed before anything was paid: returns to step 3 with a Notice `danger` carrying the reason, ending "Nothing was traded."
- Order not placed after the holding was opened: Text `display` "Order not placed". Text `body` (dim): "The holding is open. The network cost for that is already paid and cannot be returned. Nothing else was charged, and placing the order again has no further network cost." Button `primary` "Review a new price" (prices again and returns to step 3, where the Network cost Row reads "Already paid"), Button `quiet` "Close".

**States.**

- Loading: "Review buy" reads "Getting a live price..." while the quote and its network cost are worked out. Nothing else on the sheet moves.
- Empty (buy, nothing to invest): said on the sheet's first step, whichever it is, and never three steps in (`noMoneyView`). EmptyState "No money in this portfolio yet" (or "No money in your portfolios yet" when the buy starts from a tracker's page and none of them has anything). With USDC waiting in the funding wallet the detail reads "Move money into this portfolio first." and the Button `primary` reads "Move to portfolio" (closes this sheet, opens 2.16). With none waiting the detail reads "Your money arrives in your funding wallet. Then you move it into a portfolio." and the button reads "Add money" (closes this sheet, opens 2.15a).
- Error at pricing, shown as Notice `danger` on step 2: "Could not get a price for this trade." · "The live price exceeds your available cash. Enter a smaller amount." · "This quote is more than 10% worse than the current market price. Not offered." · "Could not check the network cost of this order. Get a new price."
- Offline: "Review" and "Confirm" are disabled; standard banner inside the sheet.
- Price unavailable: buying is possible in Dollars only and selling in tokens only; the other segment is disabled with caption "No live price to convert with." The Estimate row reads "At review". On the review, when the quote could not be compared with a live price, Notice `warning`: "No live price was available to compare this quote against. Check the price per token above before you confirm."
- Fee not verifiable: Confirm is replaced by "Get a new price" and Notice `warning`: "The fee for this quote could not be verified. Get another price before confirming."
- Price expired: line 5 reads "This price expired. Get a new price to continue." and the primary button becomes "Get a new price", which prices again and shows a fresh review that needs its own Confirm.
- Price moved while placing: the review is replaced by the new quote, Notice `warning` on top: "The price moved before this order could be placed. Nothing was traded. Review the new price." A new Confirm is required. If the holding had been opened first, the result "Order not placed" above is shown instead.
- Order too small: Notice `warning` on the review: "The smallest order right now is about 12.00 USDC." Confirm disabled.
- No market maker quoting: "No price is available for this right now. Try again in a moment." Confirm disabled.
- Relayer unavailable (a first buy needs the holding opened and the relayer cannot be used): Notice `warning`: "This can't be done right now. Nothing was charged. Please try again in a few minutes." Confirm disabled.
- Network cost rose after review: Notice `warning`: "The network cost rose before this could be sent. Nothing was sent." The row shows the new figure and a new Confirm is required.
- Tracker cannot be bought right now (the issuer has paused it, or a multiplier change is taking effect): the shared logic's reason is shown as Notice `warning` and Confirm is disabled.
- Amount cannot be shown truthfully (multiplier unreadable): step 2 shows "This token's balance cannot be shown right now. Try again in a moment." and Review is disabled.
- Retired tracker: Buy is never offered; Sell works.
- Locked mid-flow: section 3.4.

**Validation.**

- The amount must be a finite number above zero.
- Buy: at most the portfolio's cash ("More than your available cash."). Sell: at most what is held ("More than this portfolio holds.").
- "Max" on a buy spends all the cash. "Sell all" sells the exact held amount, so no dust is left.
- Below the smallest order figure the shared logic reports (about 12 USDC), "Review" is disabled with caption "The smallest order is about 12 USDC."
- If the live quote would spend more than the cash available, the review is not shown.

**Disabled.** Each disabled primary has its reason directly above it, as listed in States and Validation. Confirm is also disabled while the pending block is active (3.3), with the pending note as the reason.

**Haptics.** Light impact on segment change and on choosing a portfolio. Medium impact on Confirm. Success notification when landed. Warning notification on unknown and when the review is replaced. Error notification on failure.

**Accessibility.** The amount Field announces its label and unit. The two headline lines of the review are one heading: "Spend 100 dollars from Investing, receive at least 0.4215 NVDAx". The countdown is not a live region; it is read on focus, and expiry is announced once. The risk line, its "Read the risks" link and the public line come before Confirm in reading order. "The holding is open..." is announced when it appears. At large text sizes every review Row stacks label over value, and the sheet scrolls with Confirm at the end of the content rather than pinned, so nothing is covered.

**Never shows.** The words swap, slippage, route, liquidity, gas or gasless. The network's own currency. A Confirm that acts on an expired or replaced price. A retry while the outcome is unknown. The funding wallet. A claim that the trade is private.

**Shared logic.** Quote a trade. Work out the network cost of orders. Confirm a trade. Read pending action state. Refresh one portfolio's balances.

---

### 2.21 Pie order (sheet)

**Purpose.** Put money into a pie's mix, or bring a drifted pie back to it, as a reviewed set of orders.

**Entry points.** "Invest" and "Rebalance" on a pie's Portfolio detail.

**Step 1, invest.**

1. Sheet, title "Invest in Core", with the pie's identity line and header mark. Close X.
2. Field, numeric decimal, `display` size, label "Invest, in dollars", placeholder "0.00", with trailing Button `quiet` "Max".
3. Row "Cash available" · Money.
4. Section "How it splits, toward your targets": one Row per order, tracker name · Money, largest first. It updates as the amount changes.
5. Button `primary`, full width: "Review orders".

**Step 1, rebalance.**

1. Title "Rebalance Core".
2. Text `body` (dim): "Rebalancing sells what sits above target, then invests what that returns into what sits below. Each half is priced and reviewed before anything is placed."
3. One Row per sell: "Sell NVIDIA" · "about $42.10".
4. Button `primary`, full width: "Price the sells".

**Step 2, pricing.** Text `body` (dim), centred: "Getting live prices, one order at a time..." No close, no Back.

**Step 3, review.** For a rebalance, Text `caption` (dim) first: "Step 1 of 2: sell what is above target." or "Step 2 of 2: invest what the sells returned."

1. Panel, one entry per order: name and trailing amount (Money for a buy, tokens for a sell); under it Text `caption` (faint): "Pay $50.00 · expect 0.2119 NVDAx · at least 0.2108 NVDAx · fee 0.50%" (sell: "Sell 0.1785 NVDAx · expect $42.10 · at least $41.89 · fee 0.50%").
2. Rows: "Total you pay" · "100.00 USDC" (sells: "You expect to receive"); "Fees, included above" · "about $0.50 · 0.50%"; "Of which NoirWire" · "0.50%"; "Stays as cash after rounding" · Money (when not zero); "Network cost" · the figure.
3. The network cost reason line, when there is one: "The network cost includes opening 3 holdings, a one-time cost."
4. Text `caption` (faint): "Orders are placed one at a time. Each stops if it would deliver less than its minimum. Prices are held until 14:32:10. One that expires before its turn is priced again, and you are asked first if the new price is worse."
5. Buying, one line, Text `caption` (dim): "These are trackers, not shares, and their issuer keeps control over them." with Button `quiet`, text only: "Read the risks" (2.34).
6. One line, Text `caption` (warning): "This portfolio's trades and holdings are public."
7. Button `primary`, full width: "Place 4 orders". Beside it, Button `quiet`: "Back" (on step 2 of a rebalance: "Keep as cash", which ends the flow with the sell proceeds left as cash).

**Step 4, progress.** Title "Opening the holdings..." (when holdings are opened first), then "Placing buys..." or "Placing sells...". When the holdings are open, a Text `caption` (dim) stays above the list: "The holdings are open. The network cost for that is already paid." StepList, one item per order, each with a status word: "Waiting", "Placing...", "Placed", "Failed", "Not placed". A failed item shows its reason under it. The sheet cannot be dismissed.

A price that expired and came back worse interrupts the run with a Panel in the sheet (not a system alert, because the two sets of terms have to be read side by side): Text `title` "The price for NVIDIA expired, and the new one is worse." Text `caption` "Reviewed: Pay $50.00 · expect 0.2119 NVDAx · at least 0.2108 NVDAx · fee 0.50%" and "Now: Pay $50.00 · expect 0.2101 NVDAx · at least 0.2090 NVDAx · fee 0.50%". Button `primary` "Accept new price", Button `quiet` "Stop here". The run waits for the answer.

**Step 5, result.** A pie's result stays in the sheet, because each order has its own outcome to read.

- Text `display`: "All 4 orders placed", or "2 of 4 orders placed", or "No order was placed".
- The StepList with final statuses.
- Text `caption` (faint), when the run stopped: "Nothing after the stopped order was placed. Check the balances before going on."
- Button `primary`: "Done".

After the sells of a rebalance land, the flow goes straight to pricing the buys from the cash the sells actually returned, read from the chain. If that cash cannot be read: "The sells went through, but the cash they returned could not be read. Invest it once the balance shows."

**States.**

- Loading: step 2.
- Empty (invest, nothing to invest): EmptyState "No money in this pie yet" with the same detail and button as a buy with nothing to invest (2.20).
- Empty (rebalance, nothing to sell): "Nothing is far enough above target to sell." and the primary is disabled.
- Error at pricing: returns to step 1 with Notice `danger`: "NVDAx: Could not get a price for this trade." or "Could not check the network cost of these orders. Try again." or "QQQx is no longer offered to buy. Edit the mix to remove it first."
- Offline: primaries disabled, standard banner.
- Price unavailable: Text `caption` (faint) on step 1: "Waiting for live prices, so the split can account for what the pie already holds." Primary disabled. On the review, when a quote could not be compared: "No live price was available to compare some of these quotes against. Check each order above before you confirm."
- Relayer unavailable, pending block, cost rose: as 2.20, with "Place orders" disabled.
- Amount too small for this mix: caught on step 1, before any pricing (see Rules).
- Holdings opened, then an order failed: the result names both facts: "The holdings are open. The network cost for that is already paid and cannot be returned."
- Balances unreadable before a sell run: "Balances could not be read, so nothing was placed. Try again."
- Unknown outcome on one order: that item reads "Placed, but the new balances could not be read yet. Stopped here." or, when it was sent without confirmation, the unknown text from 3.3; the run stops and every later item reads "Not placed".
- Locked mid-flow: section 3.4. A run in progress stops after the order that is in flight.

**Rules.**

- Investing splits the cash toward the targets: each tracker receives in proportion to how far it sits below its target once the new cash is counted. An empty pie splits exactly by weight. Amounts round down to the cent.
- There is no fixed minimum per order. Every order has to reach the smallest order the venue will place (about 12 USDC, and it moves with the market). Before the review, the app works out from the pie's weights and current holdings whether every order of this split reaches it.
- When one would not, the review is not offered and step 1 says, under the split: "With this mix, invest at least about $120.00 right now so every order can be placed. This figure is approximate and depends on live prices." The figure is the smallest order divided by the smallest share this split gives any tracker, rounded up to the next dollar. Button `quiet`, text only, beside it: "Use $120.00".
- The floor is approximate by nature. A split that passes this check can still be told at review that an order is too small, because the real answer comes with the quotes. In that case the review shows: "The smallest order right now is about 12.00 USDC." and the same suggested amount.
- Rebalance sells are offered only for slices above target by at least the smallest order, never more than is held. Smaller drifts are left alone, and the rebalance step says so: "Smaller differences are left as they are."
- Orders run one at a time, in the order shown. The run stops at the first failure and after any order whose new balances cannot be read.
- A replacement price is placed without asking only when it is no worse on every reviewed term: no more spent, at least the same minimum, no higher fee. Otherwise the user is asked.
- The web app places pie orders from $1.00 each. The phone does not, because an order that small cannot be placed under the smallest-order rule.

**Disabled.** "Review orders" while the amount is zero, above the cash, or below the smallest amount for this mix; while prices are missing. "Place orders" while a fee or a quantity cannot be verified ("A fee could not be verified. Go back and price the orders again." · "A token quantity cannot be shown right now. Try again in a moment.").

**Haptics.** Medium impact on "Place orders". Light impact as each order is placed. Success notification when all are placed. Warning notification when the run stops or asks about a new price.

**Accessibility.** Each StepList item announces its status change with the tracker name ("NVIDIA, placed"). The new-price Panel takes focus when it appears and is announced as an alert. The split list is read as "NVIDIA, 50 dollars".

**Never shows.** Orders placed in parallel. A total that hides a failed order. An automatic retry. A recurring or scheduled option.

**Shared logic.** Plan an invest split. Plan rebalance sells. Quote a trade. Work out the network cost of orders. Open holdings for trackers. Run orders one at a time. Refresh one portfolio's balances.

---

### 2.22 Activity

**Purpose.** List what has moved, newest first.

**Entry points.** Activity tab. "See all" on Home and on Portfolio detail.

**Layout.**

1. Screen, scrollable. Top bar title "Activity".
2. Chips, single select, horizontally scrollable: "All", "Money in", "Money sent", "Trades", "Earn".
3. Activity rows, 64pt, grouped under date headings in Text `caption` (faint) ("Today", "Yesterday", "28 Sep 2026"):
   - Leading: a 32pt elevated circle with an icon: arrow down (money in), arrow up (sent), trend up (bought), trend down (sold), and the Earn icon with a small arrow in or out (Earn).
   - Title, Text `body`: "Money arrived", "Sent", "Bought NVIDIA tracker", "Sold NVIDIA tracker", "Deposited to Earn", "Withdrew from Earn".
   - Caption (faint): the portfolio name. For a send: "To an address you entered · Investing". The address itself is not in the row.
   - Trailing: Money with a sign ("+$100.00" in safe for money in and sells; "-$100.00" in ink for sends and buys; Earn deposits and withdrawals carry no sign and no colour, because the money stays the portfolio's), and under it the amount in its own unit ("0.4239 NVDAx").

**States.**

- Loading: none; the log is on the device and renders at once.
- Empty, nothing ever: EmptyState "Your buys, sells and money moves will appear here." with Text `caption` (faint) "History is kept on this phone only. A wallet restored on a new phone starts with an empty list."
- Empty, filter: "Nothing matches that filter."
- Populated: as above.
- Value unknown: when an entry had no live price at the time, the Money is replaced by Text `caption` (faint) "Not priced". An older tracker entry recorded only as raw tokens reads "0.4239 NVDAx (raw tokens)".
- Error, Offline, Price unavailable, Relayer unavailable: not applicable; the list is local.
- Locked mid-flow: standard.

**Interactions.** Tapping a row opens Activity detail (2.28). Chips filter in place. The list loads 50 rows at a time as the user scrolls.

**Disabled.** Nothing.

**Haptics.** Light impact on chip selection.

**Accessibility.** Each row is one element: "Bought NVIDIA tracker, Investing, 28 September, 100 dollars, 0.4239 NVDAx". The sign is spoken as "plus" or "minus", not conveyed by colour alone.

**Never shows.** Any part of an address in the list. A transaction link.

**Shared logic.** Read the activity log. The log records six kinds: money in, sent, bought, sold, Earn deposit, Earn withdrawal. The last two are additions to the web app's log and belong in the shared core.

---

### 2.23 Pie builder (sheet, and the body of "New pie")

**Purpose.** Choose up to ten trackers and give each a whole-percent target, adding to 100.

**Entry points.** "Edit mix" on a pie's Portfolio detail (this sheet). The "Pie" option in New portfolio (2.14 embeds items 2 to 6).

**Layout.**

1. Sheet, title "Edit mix", with the pie's identity line. Close X. Text `body` (dim): "Changing the mix places no orders. Invest and Rebalance then steer toward it, and anything you drop stays held until you sell it."
2. Row: PieRing, 88pt, with the tracker count in its centre; beside it Text `title` the total ("100%", in warning when it is not 100) and Text `caption` (faint): "Fully allocated", "15% left to place", or "5% over". Under them, when there are two or more trackers and the mix is not already even, Button `quiet` text only: "Split evenly".
3. One row per tracker, 56pt: tone dot, IdentityMark, name with the ticker as caption, a Stepper (minus, a 56pt numeric field, plus; each press changes the value by 5), and a trailing remove icon button.
4. While there are fewer than ten trackers: the tracker chooser (as 2.20 step 1b), labelled "Pick the trackers for this pie" when empty and "Add another tracker" otherwise. Trackers already in the mix are left out of the results.
5. Text `caption`, the problem line, when the mix cannot be saved.
6. Button `primary`, full width: "Save mix" (in New pie: "Create pie").

**States.** Loading: button reads "Saving...". Empty: no rows; the chooser is first. Error: Notice `danger` with the reason if saving fails. Works offline. Price unavailable and Relayer unavailable: not applicable, nothing is priced or sent. Locked mid-flow: standard, unsaved changes are discarded.

**Rules, with the problem line for each.**

- At least one tracker: "Add at least one tracker."
- At most ten: "A pie holds at most 10 trackers."
- No tracker twice: "Each tracker can appear once."
- Only listed trackers: "Only listed trackers can be added."
- No retired tracker: "QQQx is no longer offered to buy. Remove it from the mix."
- Every target a whole number of at least 1: "Every tracker needs at least 1%."
- Targets add to exactly 100: "The mix adds up to 95%. It needs to be 100%."
- A typed target is rounded to a whole number and clamped to 0 to 100.
- While the mix is an even split it stays one as trackers are added or removed (the remainder goes to the first trackers). Once any target has been set by hand, adding a tracker adds it at 0% and leaves the others alone.

**Disabled.** "Save mix" while a problem exists; the problem line is the reason. "Create pie" also while the name is empty.

**Haptics.** Light impact on each Stepper press and on "Split evenly". Success notification on save.

**Accessibility.** Each Stepper is an adjustable control labelled "NVDAx share in percent", with increment and decrement actions of 5; the field accepts typed values. The total is a polite live region ("95 percent, 5 percent left to place"). Remove buttons are labelled "Remove NVDAx". At large text sizes the Stepper moves under the name.

**Never shows.** A price or a cost: saving a mix moves nothing. Fractional percentages.

**Shared logic.** Check a mix. Split a mix evenly. Save a pie's mix. Search the catalog.

---

### 2.24 Send (sheet)

**Purpose.** Send cash or a tracker from one portfolio to an address, with every check that can stop a mistake.

**Entry points.** "Send" on Portfolio detail.

**Step 1, details.**

1. Sheet, title "Send from Investing", with the portfolio's identity line and header mark. Close X.
2. Chips, single select: "Cash" and one per tracker held ("NVDAx", ...). Anything else the address holds is not offered here.
3. Field, label "Recipient address", placeholder "Solana address", monospaced digits, two lines tall, autocorrect and autocapitalise off. Trailing controls: Button `quiet` "Paste" and a scan icon button ("Scan a QR code").
4. Field, numeric decimal, label "Amount in USDC" (the chosen asset), placeholder "0.00", with trailing Button `quiet` "Max".
5. Row "Available" · "457.33 USDC".
6. Button `primary`, full width: "Review".
7. Text `caption` (faint): "A real transfer on Solana, straight from this portfolio to the recipient. It cannot be reversed. The address is checked to be a wallet and not a token, a token account or a program; who owns it is not verified. This portfolio pays its own network cost in USDC, a few cents taken from its cash, and the review shows the amount first."

**Step 1b, scan.** Replaces the sheet content; Back returns to step 1.

1. Scanner, filling the sheet, with a square guide.
2. Text `caption`: "Point the camera at the recipient's address code."
3. Without camera permission: EmptyState "Camera access is off." with Text `caption` "Allow the camera in system settings to scan a code, or paste the address instead." and Button `quiet` "Open settings".

A scanned code is accepted when it is a plain Solana address, or a `solana:` payment code, from which only the address is taken. In the second case step 1 shows Notice `info`: "Only the address was taken from this code. Enter the amount yourself." Anything else: "That code is not a Solana address." and the scanner stays open. The camera frame is never stored or sent.

**Step 2, review.**

1. Text `caption` (faint): "Recipient address"
2. Panel: the full address in groups of four characters, the first six and last six characters in ink-strong and medium weight, the middle in dim.
3. Rows: "Tracker" or "Cash" · the asset; "Amount" · "100.00 USDC"; "Value" · Money (only with a live price); "Network cost" · the figure (3.1).
4. When sending all the cash and the cost comes out of it, Notice `warning`: "0.02 USDC of this portfolio's cash pays the network cost, so 99.98 USDC is sent, not 100.00 USDC."
5. The network cost reason line, when there is one: "The network cost includes opening the recipient's account for this token, a one-time cost."
6. The recipient check, exactly one of:
   - Own address: Notice `danger`, Text `title` "This links the two addresses publicly." and body "Anyone can then see that this portfolio and your funding wallet belong to the same person." (or "and your other portfolio (Long term)"). Then Acknowledge: "I understand this links them".
   - Look-alike: Notice `danger`, Text `title` "This address looks like one you have used before but is different." Then the earlier address in full, labelled "Previous recipient:" or with the portfolio's name, and "Check every character against the source, not just the start and end." Then Acknowledge: "I have checked the full address".
   - First time: Notice `warning`: "First time sending to this address. Check every character against the source, not just the start and end."
   - Sent to before: nothing.
7. For a large send, Field, label "Type the last 4 characters of the recipient address to confirm this large send" (or "to confirm this send" when the value is unknown), four characters at most.
8. The pending note, when there is one (3.3).
9. Text `caption` (warning): "This cannot be undone."
10. Button `primary`, full width: "Send".

**Step 3, progress.** Title "Sending 100.00 USDC". StepList: "Checking the recipient", "Sending on chain", "Confirming". No close, no Back.

**Step 4, result.**

- Landed: Text `display` "Sent 100.00 USDC". Text `body` (dim): "To the address you entered. It has left Investing." Button `primary` "Done", which closes the sheet to the updated portfolio.
- Unknown: "Sent, but not confirmed" · "This was sent but could not be confirmed. It may still go through. Check Investing's balance before trying again." · Button `primary` "Close". Section 3.3 applies.
- Failed: returns to the review with Notice `danger` and the reason.

**States.**

- Loading: "Review" reads "Checking..." while the recipient and the cost are checked.
- Empty: the portfolio holds nothing: EmptyState "This portfolio is empty." with Button `quiet` "Close" (the Send button on the parent is disabled in this case, so this is a guard).
- Offline: Review and Send disabled; standard banner.
- Price unavailable: the Value row is omitted and the send counts as large, so the last-four field is required.
- Amount cannot be shown truthfully: "This token's balance cannot be shown right now. Try again in a moment." Review disabled.
- Relayer unavailable: Notice `warning` on the review: "This can't be done right now. Nothing was charged. Please try again in a few minutes." Send disabled.
- Not enough cash for the cost (sending a tracker from a portfolio with too little cash): Notice `warning`: "This portfolio needs at least 0.02 USDC to pay the network cost, and would have 0.00 USDC to spare." with Button `quiet` "Move to portfolio" (closes this sheet, opens fund).
- Network cost rose: "The network cost rose before this could be sent. Nothing was sent." The row shows the new figure; a new tap on Send is required.
- Recipient changed between review and signing: on Send, the recipient is read again immediately before signing. If it has become something that cannot receive (a token account, a program), the send is refused with the matching message from the checks below and nothing is sent. If whether the recipient already has an account for this token has changed, the network cost has changed with it: nothing is sent, the review is shown again with the new cost and its reason line, with Notice `warning` "The recipient's account changed while you were reviewing, so the network cost is different. Nothing was sent.", and for a Max send the amount is worked out again from the new cost. A new tap on Send is required. If nothing about the cost changed, the send goes ahead.
- Locked mid-flow: section 3.4.

**Recipient checks and their refusals.**

On step 1, as Text `caption` (danger) under the field once it has been left:

- Not a well-formed address: "Enter a valid Solana address."
- This portfolio's own address: "Choose an address other than this portfolio's own."
- An address no key can sign for: "This address has no private key behind it: it is a token account or another address a program controls, not a wallet. Ask for the recipient's wallet address."
- A paste containing characters that cannot be in an address, as Text `caption` (warning): "Pasted text contains characters that cannot be part of an address. Check the address before continuing."

On "Review", after reading the address from the network, as Notice `danger` on step 1:

- "This is a program's address, not a wallet. Anything sent to it could not be moved again."
- "This is a token's own mint address, not a wallet. Anything sent to it could not be moved again."
- "This is a token account, not a wallet. Send to the wallet address that owns it instead."
- "This address is an account that a program controls, such as a stake account, not an ordinary wallet. Ask for the recipient's wallet address."

An address that does not exist yet is allowed: it is a wallet nobody has funded.

Classification for the review: own address (the funding wallet or any portfolio, exact match) comes first; then an address sent to before from this phone; then a look-alike (a different address whose first three and last three characters match one of the user's own or a previous recipient); otherwise first time.

**Amount rules.**

- A finite number above zero: "Enter an amount greater than zero."
- At most what is held: "More than this portfolio holds."
- "Max" for a tracker fills the exact held amount and moves the exact stored raw balance, so no dust is left.
- "Max" for cash is the exact raw balance minus the network cost. On step 1 it fills the full balance; the review then works out the cost and shows the amount actually sent, which is the raw balance minus exactly the reviewed cost, with the notice in item 4. What is signed is that reviewed figure to the last unit.
- A send is large when its value is above $1,000, when it is more than half of the holding, or when it has no live price.

**Disabled.** "Review" until the address and amount are valid. "Send" until: the cost can be paid, any required acknowledgement is checked, the last four characters match, and the pending block is clear. The missing item is the reason, shown above the button: "Confirm that you understand the link this creates." · "Confirm that you have checked the full address." · "Type the last 4 characters of the address."

**Haptics.** Light impact on a successful scan. Warning notification when a danger notice appears on the review. Medium impact on Send. Success notification when landed. Error notification on a refusal.

**Accessibility.** The review address is read in groups of four characters. Notices are announced as alerts when the review opens, before the amount rows are reachable. The acknowledgement is a checkbox with its sentence as the label. The scanner has a visible Paste alternative. At large text sizes the address wraps to more lines and never truncates.

**Never shows.** A truncated address on the review. An address book or suggestions from other apps. A "send to my funding wallet" shortcut. A retry while the outcome is unknown.

**Shared logic.** Plan a send. Check that a recipient is a wallet. Classify a recipient. Confirm a send. Read pending action state.

---

### 2.25 Settings

**Purpose.** One list for security, privacy and the things that are done rarely.

**Entry points.** Settings tab.

**Layout.**

1. Screen, scrollable. Top bar title "Settings".
2. Section "Security and recovery", a Panel of Rows, each 56pt:
   - "Recovery phrase" · caption "Your way back in if you forget your password" · chevron (2.29)
   - "Password" · caption "Change your wallet password" · chevron (2.30)
   - "Unlock with Face ID" · Switch. Caption: "Your password is still needed to view your recovery phrase and to change the password." Shown only when the device has biometrics enrolled; the method is named as the system names it.
   - "Lock now" · no chevron; tapping locks at once.
3. Section "Wallet":
   - "Funding wallet" · trailing Money (its USDC balance) · chevron (2.31)
   - "Costs" · caption "What buying, moving and sending cost" · chevron (2.31a)
4. Section "Privacy":
   - "Privacy and your funds" · caption "What others can see, on chain and off" · chevron (2.32)
   - "Usage analytics" · Switch, on by default. Caption: "Counts which screens and actions are used. Never an address, a name, an amount, a tracker or anything you type."
   - "Risks" · caption "What you should know before you invest" · chevron (2.34)
5. Section "About":
   - "About NoirWire" · trailing the version ("1.0.0") · chevron (2.33)
6. Section "Danger zone":
   - "Reset wallet" in danger · caption "Deletes the wallet from this phone" · chevron (2.11)

**States.**

- Populated: as above.
- Error, storage failing: Notice `danger` at the top: "Changes are not being saved on this phone (storage is full or blocked). What you see here will be gone when the app closes. Your funds are not affected."
- Biometrics changed on the device: the Switch is off and its caption reads "Face ID settings changed on this phone, so this was turned off. Turn it on again to keep using it."
- Offline: everything here works offline.
- Loading, Empty, Price unavailable, Relayer unavailable: not applicable.
- Locked mid-flow: standard.

**Interactions.**

- Turning biometric unlock on asks for the password first (an inline secure Field with "Turn on" replaces the row's caption), then shows the system biometric prompt, then stores the key as in 3.14. Turning it off needs neither and deletes the stored key.
- The analytics Switch takes effect immediately. The phone sends the same closed list of events as the web app, through NoirWire's own server, and nothing outside that list: no address, no amount, no tracker symbol, no portfolio name, no typed text. Events that coincide with a transaction are reported late and without anything identifying a visit.

**Disabled.** Nothing.

**Haptics.** Light impact on a Switch change.

**Accessibility.** Each Row is one element with its caption as a hint. Switches announce their state. The danger row is last and is announced as "Reset wallet, deletes the wallet from this phone".

**Never shows.** The phrase or the password on this screen. An address. A balance other than the funding wallet's cash.

**Shared logic.** Turn biometric unlock on or off. Set the analytics choice. Lock the wallet.

---

### 2.26 Earn

**Purpose.** Show today's lending rate and how much of the user's cash is earning it.

**Entry points.** Earn tab. The "Earning" Row on Home. The Earn line on Portfolio detail.

**Layout.**

1. Screen, scrollable, pull to refresh. Top bar title "Earn", trailing Text `caption` (faint) "Jupiter Lend".
2. Text `caption` (faint): "Current variable rate"
3. Text `display`: "4.16%"
4. Text `body` (dim): "Your cash could earn 4.16% a year at today's rate."
5. Text `caption` (faint): "Supply 3.79% · rewards 0.37%. The rate changes."
6. Button `primary`, full width: "Deposit". Under it, when anything is in Earn, Button `quiet`, full width: "Withdraw". There is one Deposit action for the screen; the portfolio is chosen first, inside the sheet.
7. Section "Your portfolios". One Row per portfolio, 72pt: IdentityMark, name, caption "$312.40 cash available"; trailing Money with caption "in Earn". When the venue reports it, a second caption in safe: "$1.20 earned since deposit". An archived portfolio carries the caption "Archived" in warning.
8. One line, Text `caption` (dim): "Lending carries risk and the rate changes." with Button `quiet`, text only: "Read the risks" (2.34).

**States.**

- Loading: Skeleton for the rate and for each Row's trailing value.
- Empty, no portfolio: EmptyState "Create a portfolio to use Earn." with Button `quiet` "New portfolio".
- Populated: as above.
- Error or rate unavailable: line 3 reads "Unavailable" in `body` size, line 4 reads "A current lending rate is unavailable.", line 5 is omitted. No stale rate is shown.
- Position unreadable for a portfolio: its trailing value reads "Unavailable", and it cannot be chosen for a deposit or a withdrawal until it can be read.
- Offline: standard banner; both buttons disabled.
- Price unavailable: not applicable.
- Relayer unavailable: not surfaced here; it appears in the review.
- Network other than mainnet (preview builds only): Notice `warning` "Earn is available on Solana mainnet only." and both buttons disabled.
- Locked mid-flow: standard.

**Interactions.**

- "Deposit" opens the Earn action sheet (2.27) in deposit mode at its choose-portfolio step. "Withdraw" opens it in withdraw mode.
- Tapping a portfolio Row opens the sheet with that portfolio already chosen, in deposit mode when it has cash, otherwise in withdraw mode.

**Disabled.**

- "Deposit" is disabled when no active portfolio has cash to deposit. Reason, Text `caption` under it: "No portfolio has USDC to deposit. Move money into a portfolio first." A Deposit action is never offered when there is nothing to deposit.
- "Withdraw" is not rendered when nothing is in Earn.

**Haptics.** None beyond pull to refresh.

**Accessibility.** The rate is read as "Current variable rate, 4.16 percent a year". Each Row is one element: "Long term, 312 dollars 40 cents cash available, 0 dollars in Earn". The risk line and its link are reached after the list, and appear again in the deposit review before the confirm button.

**Never shows.** A projected balance, a guaranteed or fixed rate, the words "savings", "interest account", "safe" or "insured". A stale rate.

**Shared logic.** Read the lending rate. Read each portfolio's Earn position. Refresh portfolio balances.

---

### 2.27 Earn action: deposit and withdraw (sheet)

**Purpose.** Lend a portfolio's cash, or bring it back.

**Entry points.** "Deposit", "Withdraw" or a portfolio Row on Earn.

**Step 1, choose portfolio.** Skipped when opened from a Row.

1. Sheet, title "Deposit" or "Withdraw". Close X.
2. One Row per active portfolio that qualifies, single select: IdentityMark, name, trailing "$312.40 cash" (withdraw: "$120.00 in Earn"). Deposit lists only portfolios with cash; withdraw only those with money in Earn.
3. Button `primary`, full width: "Continue with Long term".

**Step 2, amount.** The header carries the portfolio's mark and identity line.

1. Text `body` (dim): "Lend USDC from Long term." (withdraw: "Return USDC to Long term.")
2. Field, numeric decimal, large, label "Amount in USDC", placeholder "0.00", trailing Button `quiet` "Max".
3. Row "Available" · Money. For a deposit this is the cash less the network cost, since cash that pays the cost cannot also be lent.
4. Deposit only, once the amount is valid, Text `caption` (dim): "About $4.16 in a year at today's 4.16% variable rate. This is an estimate, not a promise."
5. Button `primary`, full width: "Review".

**Step 3, review.**

1. Panel of Rows. Deposit: "Leaves Long term's cash" · "100.00 USDC"; "Goes into Earn" · "100.00 USDC"; "Network cost" · the figure; Divider; "Total leaving Long term's cash" · "100.01 USDC". Withdraw: "Leaves Earn" · "100.00 USDC"; "Network cost" · the figure; Divider; "Arrives in Long term's cash" · "99.99 USDC".
2. The network cost reason line, when there is one: "The network cost includes opening this holding, a one-time cost." Withdraw: "The network cost is paid out of the USDC this returns, so no USDC is needed first."
3. Deposit only, one line, Text `caption` (dim): "USDC is lent through Jupiter Lend. It is not a bank deposit, and withdrawals can be delayed." with Button `quiet`, text only: "Read the risks" (2.34, shown as a step inside this sheet).
4. The pending note, when there is one.
5. Button `primary`, full width: "Deposit 100.00 USDC" or "Withdraw 100.00 USDC". The action is called "Withdraw" everywhere: on the Earn screen, in the sheet title and on this button.

**Step 4, progress.** Title "Depositing 100.00 USDC" or "Withdrawing 100.00 USDC". StepList: "Sending on chain", "Confirming", "Reading the new balance".

**Step 5, result.**

- Landed: Text `display` "Deposited 100.00 USDC" with Text `body` (dim) "From Long term, now in Earn.", or "Withdrew 99.99 USDC" with "Back in Long term's cash." Button `primary` "Done", which closes the sheet to the updated Earn screen.
- Unknown and Failed: as 2.20.

The web app combines amount and confirmation in one step. The phone adds the review step so that Earn follows the same lifecycle as every other money action.

**States.**

- Loading: "Review" reads "Checking..." while the network cost is worked out.
- Offline: primaries disabled; standard banner.
- Relayer unavailable: Notice `warning` on the review: "This can't be done right now. Nothing was charged. Please try again in a few minutes." Confirm disabled. Apart from the pool itself, this is the only thing that stops a withdrawal: a withdrawal works with zero cash in the portfolio, because it pays its cost out of what it returns.
- Pool cannot return the amount now: said before confirmation. When the review is prepared, the app asks the venue what the pool can return at this moment. If it is less than the amount, the review shows Notice `warning`: "The lending pool can return up to 62.00 USDC right now, because the rest is lent out. Nothing was charged. Withdraw a smaller amount, or try again later." with Button `quiet` "Use 62.00 USDC", and the confirm button is disabled. If the venue still refuses at the moment of signing, the same notice is shown, nothing is sent and nothing is charged.
- Network cost rose: as 2.20.
- Archived portfolio: not selectable. Its Row on Earn offers Text `caption` "Restore this portfolio to move funds."
- Price unavailable: not applicable.
- Locked mid-flow: section 3.4.

Other states. Empty: not reachable; the Earn screen does not offer an action when no portfolio qualifies for it.

**Validation.**

- A finite number above zero: "Enter an amount greater than zero."
- Deposit: at most the cash less the network cost. Withdraw: at most what is in Earn. Above the maximum: "More than is available."
- A withdrawal smaller than its own cost: "This withdrawal is smaller than its own network cost."
- "Max" fills the maximum exactly.

**Disabled.** "Review" until the amount is valid. "Confirm" while the cost cannot be paid or the pending block is active.

**Haptics.** Medium impact on Confirm. Success notification when landed. Warning on unknown. Error on failure.

**Accessibility.** As 2.20. The risk line and its link are read before the confirm button.

**Never shows.** The funding wallet: Earn is signed by the portfolio's own key. A promise of withdrawal at any time: the delay risk is stated.

**Shared logic.** Read a portfolio's Earn position. Work out the network cost of an Earn action. Confirm a deposit. Confirm a withdrawal. Read pending action state.

---

### 2.28 Activity detail (sheet)

**Purpose.** Show everything this phone recorded about one entry.

**Entry points.** A row in Activity, Home or Portfolio detail.

**Layout.**

1. Sheet at content height, title by kind: "Money arrived", "Sent", "Bought NVIDIA tracker", "Sold NVIDIA tracker", "Deposited to Earn", "Withdrew from Earn". Close X.
2. Money `display` with its sign, or the token amount when the entry was not priced.
3. Rows: "Portfolio" · name with IdentityMark (tappable, closes the sheet and pushes the portfolio); "Date" · "28 Sep 2026, 14:32"; "Amount" · "0.4239 NVDAx"; "Value at the time" · Money or "Not priced".
4. For a send: Row "Sent to" · "An address you entered", trailing Button `quiet` "Show". Shown, the full address appears in groups of four with Button `quiet` "Copy" and "Hide". It is hidden again when the sheet closes.
5. Text `caption` (faint): "Recorded on this phone when it happened. The transfer itself is public on chain."

**States.** Populated only. Works offline. If the portfolio no longer resolves: the Row reads "Portfolio". Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: the sheet closes.

**Interactions.** As listed. There is no "repeat" or "send again" action.

**Disabled.** Nothing.

**Haptics.** Light impact on Copy.

**Accessibility.** Rows are read label then value. The address is read in groups of four once shown.

**Never shows.** A block explorer link or a transaction id as a link. Any part of the recipient's address without a tap. Fees that were not recorded: the log holds the amount and value only.

**Shared logic.** Read one activity entry.

---

### 2.29 Settings: recovery phrase

**Purpose.** Show the phrase to someone who can type the password now.

**Entry points.** "Recovery phrase" in Settings.

**Layout.**

1. Screen, pushed, title "Recovery phrase", leading Back.
2. Text `body` (dim): "The phrase every portfolio in this wallet is derived from. It is the only way back in if you forget your password."
3. Field, secure, label "Enter your password to show it".
4. Button `primary`, full width: "Show".
5. Text `caption` (faint): "Stored encrypted under your password. Anyone who has these words controls every portfolio this wallet derives, on any device. NoirWire will never ask you for them."

After a correct password, items 3 and 4 are replaced by:

- PhraseGrid, revealed.
- Text `caption` (faint): "It hides again by itself after a minute."
- Button `quiet`, full width: "Hide phrase".

**States.**

- Loading: button reads "Checking...".
- Error: Text `caption` (danger): "That password does not match this wallet." The field is cleared.
- Populated: the revealed grid.
- Offline: works offline.
- Locked mid-flow: the words are dropped from memory at the moment of the lock; after unlock this screen shows the password field again.

Other states. Empty, Price unavailable, Relayer unavailable: not applicable.

**Interactions and rules.**

- The password is required every time. Biometrics are not accepted here, and an unlocked app is not enough: the most common way a phrase leaks is an open phone left on a table.
- The phrase hides after 60 seconds, when "Hide phrase" is tapped, when the screen loses focus, and when the app leaves the foreground.
- No Copy and no Share.

**Disabled.** "Show" while the field is empty.

**Haptics.** Error notification on a wrong password. Light impact on reveal.

**Accessibility.** As 2.3 for the grid. The auto-hide is announced ("Recovery phrase hidden") so a screen reader user is not left reading an empty grid; the 60 seconds restart while a screen reader is actively moving through the cells.

**Never shows.** The phrase behind biometrics alone. The phrase in the app switcher or a screenshot: capture-protected.

**Shared logic.** Reveal the phrase with the password.

---

### 2.30 Settings: password

**Purpose.** Replace the password that encrypts the wallet on this phone.

**Entry points.** "Password" in Settings.

**Layout.**

1. Screen, pushed, title "Password", leading Back.
2. Field, secure, label "Current password".
3. The new-password block from 2.8 (items 4 to 8): "New password" with "Suggest a passphrase", the strength line, "Confirm password", the mismatch line, the write-it-down line.
4. Button `primary`, full width: "Change password".

**States.**

- Loading: button reads "Re-encrypting..."; fields read-only.
- Success: the fields clear and a Notice `info` appears above the button: "Password changed. Use the new one next time you unlock. This protects the copy on this phone only: if you think someone already copied this wallet, move your funds to a new recovery phrase."
- Error: Text `caption` (danger): "Your current password is not right." or Notice `danger` "Could not change the password. Your old password still works."
- Offline: works offline.
- Locked mid-flow: standard; typed values are discarded.

Other states. Empty, Price unavailable, Relayer unavailable: not applicable.

**Interactions and rules.** The current password is required even while unlocked, and biometrics are not accepted in its place. The new password passes the same rules as 2.8. If biometric unlock is on, it stays on and is re-keyed to the new password as part of the change.

**Disabled.** "Change password" until the current password is entered and the new one is strong and confirmed.

**Haptics.** Success notification on change. Error notification on a wrong current password.

**Accessibility.** As 2.8. The success notice is announced as a status.

**Never shows.** The old password. A password hint feature.

**Shared logic.** Change the password. Assess a password. Suggest a passphrase.

---

### 2.31 Settings: funding wallet

**Purpose.** Show what is waiting in the funding wallet and where to send more.

**Entry points.** "Funding wallet" in Settings.

**Layout.**

1. Screen, pushed, title "Funding wallet", leading Back. Pull to refresh.
2. Text `caption` (faint): "Waiting to be moved"
3. Money `display`: the USDC balance, shown as "250.00 USDC".
4. Text `body` (dim): "Money sent here must be moved into a portfolio before you can invest."
5. Button `primary`, full width: "Move to portfolio" (opens 2.16). Rendered as `quiet` and disabled when the balance is zero.
6. Button `quiet`, full width: "Add money" (opens the add-money sheet, 2.15a).

**States.** Loading: Skeleton for the balance. Empty: balance "0.00 USDC" and line 4 reads "Nothing is waiting. Add money to your funding wallet first." Error: "Could not refresh. Pull down to try again." Offline: standard banner, last read value with the banner as its qualifier. Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: standard.

**Interactions.** As listed.

**Disabled.** "Move to a portfolio" at a zero balance, with line 4 as the reason.

**Haptics.** None.

**Accessibility.** The balance is read as "250 USDC waiting to be moved".

**Never shows.** The address on this screen. Any portfolio's address next to it.

**Shared logic.** Refresh funding balances.

---

### 2.31a Settings: costs

**Purpose.** Say what things cost before any money is moved.

**Entry points.** "Costs" in Settings. "What does it cost?" in the add-money sheet.

**Layout.** Screen, pushed, title "Costs", leading Back. Five lines of Text `body`, from `costsView({ tradeFeeBps })`:

1. "Buying or selling a tracker: 0.5% of the trade." Where no trading fee is set, the line says the fee is shown in the review and states no number.
2. "Moving money into a portfolio privately: 0.1% + $0.20." followed by how long it usually takes.
3. "Network cost: a few cents, paid automatically from your USDC."
4. "Getting USDC from another service: that service may charge its own fee."
5. "The exact amount is always shown before you confirm."

Every figure is read from the constant the review charges by. None is typed in the app.

**States.** Populated only; it works offline. Nothing to press.

---

### 2.32 Settings: privacy and your funds

**Purpose.** Say in plain words what is public, what is private, and who can see what.

**Entry points.** "Privacy and your funds" in Settings.

**Layout.**

1. Screen, pushed, title "Privacy and your funds", leading Back. Reading width, generous line height.
2. Text `title` "What is public". Text `body` (dim): "Every portfolio, its balances and every trade are real transactions on Solana. Trades stay public: anyone can see a portfolio's holdings, amounts and timing. Portfolio names stay on this phone only."
3. Text `title` "What private funding does". Text `body` (dim): "Private funding makes a portfolio harder to link back to your funding wallet. It does not make it invisible: amounts and timing may still let someone infer a connection."
4. Text `title` "What stays on this phone". Text `body` (dim): "Your keys and recovery phrase never leave this phone. So do your portfolio names, your watchlist and your activity list."
5. Text `title` "Who can see what". A Panel with one block per party, each a Text `body` name followed by two or three Text `caption` (dim) lines:
   - "NoirWire's server" · "Sees your IP address and, in transit, every address the app asks about." · "It stores and logs nothing. You have to trust that; you cannot check it." · "It could link your funding wallet to a portfolio if it logged. It does not."
   - "The network provider" · "Does not see your IP address." · "Sees every address read and every transaction sent." · "Requests made moments apart can let it guess that two addresses belong together."
   - "Jupiter" · "Does not see your IP address." · "Sees the portfolio that trades or lends. Never your funding wallet."
   - "MagicBlock, the private funding service" · "Does not see your IP address." · "Sees your funding wallet and the portfolio together. A private transfer cannot be built without naming both."
   - "NoirWire's relayer" · "Does not see your IP address." · "Sees the portfolio that sends or lends, and who it sends to." · "Every action it pays for names the same relayer on chain, so an observer can tell a portfolio uses NoirWire and can group NoirWire portfolios as a set. That does not link them to you, to your funding wallet or to each other."
6. Text `title` "Your recovery phrase". Text `body` (dim): "Anyone with your recovery phrase can take everything in every portfolio. Never share it, never type it into a website, and never reuse it for another wallet."

**States.** Populated only. Works offline. Locked mid-flow: standard.

Other states. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable.

**Interactions.** Scroll only. No links out.

**Disabled.** Nothing. **Haptics.** None.

**Accessibility.** Each title is a heading so the page can be navigated by headings. Text scales without limit; nothing truncates.

**Never shows.** "Anonymous", "untraceable", "hidden". A table that needs horizontal scrolling. A tooltip.

**Shared logic.** None.

---

### 2.33 Settings: about

**Purpose.** Say what version this is.

**Entry points.** "About NoirWire" in Settings.

**Layout.**

1. Screen, pushed, title "About", leading Back.
2. Mark, 40pt, and Text `title` "NoirWire".
3. Rows: "Version" · "1.0.0"; "Build" · the build number; "Network" · "Solana"; "Help" · "ph1l1ph@proton.me"; "Website" · "noirwire.com".
4. Rows with chevrons: "Risks" (2.34); "Terms" and "Privacy policy" (system browser); "Open-source licences" (an in-app list).

**States.** Populated only. Works offline except the two external links, which are disabled offline with the banner as the reason. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: standard.

**Interactions.** A long press on "Version" copies the version and build for support. Nothing else is copied.

**Disabled.** External links while offline. **Haptics.** Light impact on the version copy.

**Accessibility.** Rows read label then value.

**Never shows.** A device identifier, an address, or diagnostics that include either. Any statement about audits, safety or testing: that belongs to Risks.

**Shared logic.** None.

---

### 2.34 Settings: risks

**Purpose.** State once, plainly, what can go wrong.

**Entry points.** "Risks" in Settings and in About. "Read the risks" on Tracker detail (opened in place, after what the issuer can do), on the Earn screen, and inside the trade, pie order and Earn reviews (there it is shown as a step inside the sheet, with Back returning to the review).

This is the only place in the app that carries this material at length. Other screens carry one line and the link. No screen leads with a warning about the app itself.

**Layout.**

1. Screen, pushed, title "Risks", leading Back. Reading width, generous line height. Each block is a Text `title` followed by Text `body` (dim).
2. "What a tracker is" · "A tracker is an xStocks certificate that follows the price of a company or a fund. It is not a share in that company or fund. It gives you no voting rights and no claim on the company. Its price can fall, and you can lose money."
3. "What the issuer controls" · "The issuer of a tracker can freeze it, and can move or burn tokens without your signature. Dividends are not paid in cash: the issuer reinvests them by adjusting the token. xStocks are not offered in the United States, to US persons or in the issuer's prohibited countries."
4. "What stays public" · "Every trade, transfer and balance of a portfolio is public on chain, with its amount and time. Private funding makes a portfolio harder to link to your funding wallet. It does not hide what the portfolio does, and amounts and timing can still let someone infer a link."
5. "Lending through Earn" · "USDC in Earn is lent through Jupiter Lend. It is not a bank deposit and is not insured. The rate changes. A fault in the lending program can cause loss. When the pool is heavily borrowed, a withdrawal can be delayed."
6. "The software" · "NoirWire's software has not been independently audited. It checks every transaction before signing it, but software can have faults."
7. "Your recovery phrase" · "Only your recovery phrase can restore this wallet. NoirWire does not have it and cannot recover it, your password, or your funds. Anyone who has the phrase can take everything."

**States.** Populated only. Works offline. Loading, Empty, Error, Price unavailable, Relayer unavailable: not applicable. Locked mid-flow: standard; when shown inside a sheet it closes with the sheet.

**Interactions.** Scroll only.

**Disabled.** Nothing. **Haptics.** None.

**Accessibility.** Each title is a heading. Text scales without limit; nothing truncates.

**Never shows.** The words "audited" (other than in the sentence above), "safe", "secure by design", "guaranteed" or "protected" as a claim. A dismiss-forever control or an "I accept" checkbox: this is information, not consent.

**Shared logic.** None.

---

## 3. Cross-cutting patterns

### 3.1 The review

Every money action ends its input in a review with the same anatomy, top to bottom:

1. **Header.** The sheet title, the acting portfolio's mark, and its identity line.
2. **What leaves and what arrives.** Stated first, in words, with the portfolio named: "Spend $100.00 from Investing", "Receive at least 0.4215 NVDAx".
3. **The terms**, as Rows in one Panel, label left and value right: amounts, price, every fee, the network cost, and a total after a Divider. Every cost is in USDC or dollars. The total is the last Row and the heaviest weight.
4. **The minimum**, where there is one, and what happens if it cannot be met ("we will stop it").
5. **Reason lines** for anything unusual in the terms: a one-time opening of a holding, a cost taken out of the amount.
6. **Notices**, in this order: refusal or unavailability (warning), recipient checks (send), the one-line risk statement with its "Read the risks" link (buys and Earn deposits), "This portfolio's trades and holdings are public." (trades), the pending note.
7. **Acknowledgements**, where required.
8. **One Confirm.** Full width, the only filled control, named with its verb ("Confirm buy", "Send", "Deposit 100.00 USDC", "Withdraw 100.00 USDC", "Place 4 orders"). Back is the sheet's top leading control, not a second button beside Confirm, except in the pie review where "Keep as cash" is a real alternative.

**The Network cost Row.** Every review has this Row. Its value is one of:

| Value                                                   | When                                                                                                                                         | Reason line under the Panel                                                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "less than 0.01 USDC"                                   | The relayer pays the network and the portfolio pays it back under a cent. The usual case for a send, an Earn deposit and an Earn withdrawal. | None.                                                                                        |
| The real figure, two decimals ("0.02 USDC")             | The same, at a cent or more.                                                                                                                 | None, unless something is opened.                                                            |
| The real figure, when a holding is opened               | A first buy of a tracker, a first Earn deposit, a withdrawal into a portfolio with no cash holding yet.                                      | "The network cost includes opening this holding, a one-time cost."                           |
| The real figure, when the recipient's account is opened | A send to a recipient with no account for this token.                                                                                        | "The network cost includes opening the recipient's account for this token, a one-time cost." |
| "Included in the fee"                                   | A trade in a holding that already exists. The venue places the order and its fee covers the network, so nothing is charged on top.           | None.                                                                                        |
| "Already paid"                                          | Placing an order again after its holding was opened and the order was not placed.                                                            | "The holding is open. The network cost for that is already paid."                            |
| "Not available"                                         | The cost cannot be met right now.                                                                                                            | One of the "Not now" messages below, as a Notice `warning`.                                  |

What the relayer pays for: sends, opening holdings, Earn deposits and Earn withdrawals. A withdrawal is paid out of the USDC it returns, so it works with zero cash. Trades are placed by the venue at no separate network cost; a first buy of a tracker opens the holding through the relayer and then places the order, under one confirmation (2.20, step 4).

A Button `quiet`, text only, under the Panel reads "What is the network cost?" and expands an inline explanation, never a tooltip: "Every action has a small network cost. NoirWire's relayer pays it, and this portfolio pays the relayer back in USDC from its cash, in the same transaction. If the cost has risen by the time you confirm, nothing is sent and you are shown the new cost first. A transaction paid this way shows publicly that this portfolio uses NoirWire. It does not show your funding wallet or your other portfolios."

**Not now.** When the cost cannot be met, the confirm button is disabled and exactly one of these is shown. Nothing was signed and nothing moved in any of them.

- Relayer cannot be used: "This can't be done right now. Nothing was charged. Please try again in a few minutes."
- Order too small to be placed: "The smallest order right now is about 12.00 USDC."
- No price: "No price is available for this right now. Try again in a moment."
- Not enough cash for the cost: "This portfolio needs at least 0.02 USDC to pay the network cost, and would have 0.00 USDC to spare." with "Move to portfolio".

There is no conversion step anywhere. The app never asks the user to hold anything other than USDC, and never suggests the funding wallet could pay: a cost paid from there would name both addresses in one transaction.

**A changed review.** If a price, a fee or a network cost changes after the review was shown, nothing is sent, the review is replaced with the new terms, a Notice `warning` says what changed, and a new tap on Confirm is required. A review is never silently updated under the user's finger: when it is replaced, Confirm is disabled for 600 ms.

### 3.2 Progress and result

- **Progress** replaces the review inside the sheet after the confirm button is pressed. It is a StepList in plain words describing what is happening to the user's money ("Placing the order", "Reading the new balance"), not protocol steps. A step changes state only when there is evidence for it, with one 320 ms transition. There is no percentage and no estimated time. The sheet cannot be dismissed and Back is disabled.
- When an action is two transactions under one confirmation (opening a holding, then an order), the list shows them as separate steps, and as soon as the first has landed it says what that means for the user's money: "The holding is open. The network cost for that is already paid." That cost cannot be returned, and no later message implies it can.
- If progress lasts longer than 20 seconds, a Text `caption` (faint) appears under the list: "Still working. You can leave this open; nothing more is needed from you."
- **The result is a step in the same sheet**, where the action was confirmed. It has a `display` headline stating what happened ("Bought 0.4239 NVDAx", "Sent 100.00 USDC", "Funds arrived"), one `body` sentence naming the portfolio, at most one quiet action, and one Button `primary` ("Done", or "Close" when the outcome is not a success). That button closes the sheet.
- **The sheet closes to an updated screen.** The balances the action changed are read again while the result step is shown, so the screen underneath is already correct when the sheet goes away. Nothing further is shown on that screen: no banner, no toast.
- **A failure** returns to the review (or to the input step if the review can no longer be trusted) with a Notice `danger` holding the reason from the shared logic. The reason always ends by saying what state the money is in ("Nothing was sent.", "Nothing was traded.", "Not signed."), and names any cost that was already paid.
- The result step is plain: no illustration, no confetti, no share prompt, nothing that moves.

### 3.3 Pending and unknown outcomes

An action that was sent and neither seen to land nor seen to fail may still land. Confirming the same thing again in that window is how it happens twice. This is the state every money flow relies on, so it is durable.

**What is recorded.** The moment an action is handed to the network, and before the app waits for the answer, a pending entry is written inside the encrypted wallet record: which portfolio (or the funding wallet), what was intended (the kind of action, the asset, the amount, and for a send the recipient), the transaction's id when there is one, and the point after which it can no longer land. It is stored encrypted with everything else, so it is unreadable while locked and survives a lock, the app being closed, and the phone restarting. It is removed only when the chain has settled it.

**What the user sees.**

- The result step says so: "Sent, but not confirmed", with no retry control.
- From that moment every confirm button for that portfolio (trade, send, Earn, pie order) is disabled, in every sheet, and shows the pending note as a Notice `warning`: "Your last action from this portfolio was sent and is not confirmed yet. It may still go through, so nothing can be confirmed here until that is known. This takes about a minute and is checked for you."
- The same note is pinned on that portfolio's detail screen under the value.
- While the app is open and unlocked it asks the chain every 4 seconds. The block ends when the chain shows the action landed, or when its time to land has run out (about a minute, three minutes at the outside).
- When it ends, the portfolio's balances are read again, an Activity entry is written if it landed, and the note changes for the rest of that visit to: "Your last action from this portfolio went through. Check the balance before doing it again." or "Your last action from this portfolio did not go through, and no longer can. It is safe to try again."

**On the next unlock.** Pending entries are settled first, before any confirm button for the same portfolio can be enabled. Until each is settled its portfolio shows the pending note. If the network cannot be reached, the entry stays and the block stays: an unsettled action is never assumed to have failed because time has passed on the phone's clock alone; the chain has to be asked.

**Scope.** Other portfolios are not blocked. A private funding transfer with an unknown outcome is recorded against the funding wallet and blocks the fund sheet for every portfolio until the funding wallet's balance has been read again.

### 3.4 The lock gate and what resumes

The wallet locks: on a cold start; after 15 minutes without a touch; on returning from the background after more than 15 minutes; and on "Lock now" or the Home lock button. Returning from the background within 15 minutes does not lock; the privacy cover has hidden the screen meanwhile.

On lock, at once:

- Every sheet is dismissed and its typed input is discarded: amounts, recipients, acknowledgements, quotes.
- A revealed phrase, a revealed address and public view are dropped.
- Unlock replaces the whole app. Nothing is visible behind it.

After unlock:

- The user returns to the tab and stack screen they were on. No sheet reopens. No money action resumes or repeats.
- Balances and prices are read again before any value is shown as current.

What happens to a flow that was past Confirm when the lock came:

- **Signed and sent already**: the action is on its way and does not need the app. Its pending entry is already in the encrypted record (3.3). After unlock it is settled before anything else can be confirmed for that portfolio, and the outcome is reported by the pending note on the portfolio.
- **Not yet signed** (the progress step before sending, or a pie order waiting its turn): it is abandoned. Nothing is signed while locked, because no key exists while locked. After unlock a Notice `info` on the portfolio says: "The app locked before this was sent. Nothing was sent." For a pie: "The app locked partway. 2 of 4 orders were placed. Check the balances before going on." If a holding had been opened before the lock: "The holding is open. The network cost for that is already paid."
- **Private funding after it was handed over**: it settles without the app. After unlock the portfolio's balance is read and a Notice `info` on the portfolio reports the arrival ("100.00 USDC arrived in Investing."), or "Still settling" stays there until it does.

The idle timer does not fire while an action is in flight after Confirm; it is evaluated as soon as the action ends.

### 3.5 Offline

- A thin banner takes its own place at the top of the app, under the status bar, and at the top of every sheet, while the device has no connection or the app's server cannot be reached. The screens begin beneath it, so it never lies over a header, a title or a control: "You're offline. Balances and prices may be out of date, and nothing can be sent until you're back online." It is a Notice `warning` in compact form, with no close control. It disappears by itself.
- While it is shown: every primary that starts or confirms a money action is disabled, with the banner as its reason. Pull to refresh does nothing.
- Balances stay on screen as last read. Prices follow 3.7 and disappear two minutes after the last successful read.
- These work offline: unlocking, viewing and hiding the phrase, changing the password, creating a wallet, creating and editing portfolios and mixes, archiving, the activity list, Receive, public view, all of Settings.
- On reconnecting, the visible screen refreshes once, without a spinner. While offline the connection is asked about again every few seconds, so the banner clears by itself.

### 3.6 Privacy cover and capture protection

- **App switcher cover.** Whenever the app is not active, a cover (base colour with the Mark, centred) is drawn over the whole app before the system takes its snapshot. This applies to every screen and sheet.
- **Capture protection** applies to: 2.3, 2.4, 2.5, 2.7 while the address is shown, 2.8 while the password is visible, 2.15 (a portfolio's address), 2.29, public view while the address is shown, and the review address in 2.24.
  - Android: these screens set the secure window flag, so screenshots, recordings and screen sharing show black. This is reliable. A sheet is a window of its own and takes the flag over only when it is created, so a sheet that can show an address (Receive, Send, Activity detail) asks for the flag before it opens and keeps it for as long as it is open.
  - iOS: best effort. The protected content is drawn in a layer the system normally leaves out of screenshots and recordings, and when a recording or mirroring session is detected the content is concealed and replaced by Text `body` "Hidden while the screen is being recorded." The system gives no guarantee for the screenshot technique, and it can stop working in a new system version. The build must be tested for it on each supported version.
  - Because of that, no string in the app promises that screenshots are blocked. On iOS, when a screenshot is detected on a phrase screen, a Notice `warning` appears: "A screenshot was just taken. If it shows your words, anyone with your photos can read them. Delete it."
- The add-money sheet (2.15a) is deliberately not protected: it shows the person's own funding wallet address, which is what they give to another service, so a screenshot of it is allowed. Nothing else on a wallet screen is.
- Nothing sensitive is ever placed in a notification, a widget, a share sheet, or the system-wide search index.
- Text fields that hold a phrase or a password disable autocorrect, predictive text and keyboard learning.
- Clipboard: the app writes only addresses the user chose to copy, flagged as sensitive and local-only where the platform allows, and reads the clipboard only on an explicit Paste tap.

### 3.7 Price unavailable

A price is live for two minutes after the last successful read. After that, or before the first read, there is no price.

- A missing price shows no number. The value position reads "Price unavailable", "Value unavailable", or "At review" (where an order would be priced by its own quote), in `body` or `caption` size, never in `display`.
- Nothing falls back to a stored, cached or typed-in figure, and nothing is greyed to suggest "roughly this".
- A total that depends on a missing price is itself unavailable, not partial, except where the missing part is named ("Excludes money in Earn, which could not be read yet").
- Token amounts and USDC amounts still show, because they need no price.
- A tracker amount needs the issuer's multiplier. While that cannot be read the amount reads "Unavailable", never the raw token count.
- Charts are drawn only from real price history. With none: "Chart unavailable right now."
- Changes over 24 hours are labelled "approximate".

### 3.8 Numbers on a 390pt screen

**Formats.**

| Kind                         | Format                                                                           | Example             |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------- |
| Dollars                      | Two decimals, thousands separators, leading sign only when it is a change        | $8,729.89 · +$98.79 |
| USDC amounts                 | Two decimals with the unit                                                       | 457.33 USDC         |
| USDC on a review, when exact | Up to six decimals, trailing zeros dropped down to two                           | 0.105 USDC          |
| Tracker tokens               | Four decimals with the ticker                                                    | 5.1075 NVDAx        |
| Percent change               | Sign and up to two decimals                                                      | +2.21%              |
| Rates                        | Two decimals                                                                     | 4.16%               |
| Pie targets                  | Whole numbers                                                                    | 50%                 |
| Network cost under a cent    | Words                                                                            | less than 0.01 USDC |
| Dates                        | Day, short month, year                                                           | 3 Sep 2026          |
| Masked address               | The word "Hidden" with a "Show" action. A shortened address is not used anywhere | Hidden · Show       |
| Full address                 | Groups of four characters, wrapped                                               | 7xKp 4tRm ...       |

**Rules.**

- Money never truncates and never wraps in the middle of a number. In a Row the label yields: it truncates or wraps to a second line first; the value keeps its full width.
- A `display` number shrinks to fit one line, down to 60 percent of its size. Below that, the trailing unit moves to the caption line and the number keeps the line to itself.
- Digits are tabular everywhere a number can change or be compared in a column.
- A change of exactly zero is shown as "$0.00 (0.00%)" in dim, with no sign and no arrow. It is never shown in the loss colour, and neither is a change that rounds to zero.
- Gains use safe and a plus sign; losses use danger and a minus sign. Colour is never the only signal.
- Negative money uses a minus sign, never brackets.
- The only places a system truncation mark may appear are user-typed portfolio names and tracker names. Copy written by NoirWire uses three periods.
- Amount fields accept the device's decimal separator and show it; a pasted amount with a thousands separator is rejected with "Enter the amount as a number, for example 1250.50."

### 3.9 The identity line

Each portfolio has a glyph and a tint chosen by its owner (2.14, 2.17). To make the separation between portfolios something the user can see:

- A 3pt line in the portfolio's tint runs along the top edge of that portfolio's detail screen and of every sheet that acts for it: trade, send, fund, Earn action, pie order, pie builder, portfolio settings.
- The same sheets carry the portfolio's IdentityMark and name in their header. When the portfolio is chosen inside the sheet, the mark travels from its row into the header (220 ms).
- The neutral tint draws the line in ink at 40 percent.
- Screens that act for no single portfolio (Home, Markets, Earn, Activity, Settings, Tracker detail) have no line.
- The funding wallet has no glyph, no tint and no line. It is never presented as a portfolio.
- The line is decoration for sighted users; the portfolio's name in the header carries the same information for everyone.

### 3.10 Inline notices, alerts and toasts

- **Inline Notices are the default.** A message appears where its cause is: under the field it is about, above the button it disables, or in the review.
- **Field errors** appear after the field has been left or the action pressed, not while typing, except the password strength line, which is live.
- **System alerts** are used for exactly two things: "Discard this?" when dismissing a sheet with input, and the system's own permission and biometric prompts. Destructive confirmation is typed (RESET), not an alert.
- **Toasts are not used** for anything that matters. The only transient feedback is a control changing its own label for two seconds ("Copied", "Restored.").
- A Notice's kind follows meaning: `info` for a result or a neutral fact, `warning` for a caution or "not now", `danger` for a refusal or an irreversible consequence.

### 3.11 Skeletons and the top loader

One visual language carries every wait in the app: a thin light (about 2pt tall) pinned under the status bar, full width, that fades in once a wait has run past the standard's own delay and fades out the moment nothing is waiting any more. Inside a sheet it sits at the sheet's own top edge instead, since a sheet covers the status bar. It is mounted once at the app root (`TopLoader` in `src/ui`, plus one inside `Sheet`) and any screen or sheet switches it on with `useTopLoader(active)`, layered on the same boolean a screen already passes to `useWaiting`; several waits at once still show the one bar, and it stays on until none of them are left. Under Reduce Motion the sliding light is replaced by a calm, gently pulsing line. It is announced once as busy, not on every frame.

- **The bar runs for every wait**, with the screen or sheet underneath staying exactly where it was: a form keeps its fields and its button's own label (never a swapped busy label), a list or a value keeps showing what it last read. This covers content loads (Home and portfolio balance refresh, prices on Markets and tracker pages), checks (the network check at start, import's phrase lookup), and review preparation (Send, Trade, a pie order, encrypt-and-finish, unlock).
- **Skeleton** when the shape of content that has never loaded is known and it is being read: balances, lists, the rate, the chart frame. Shown only when nothing is cached; cached values render at once and are refreshed in place. This is an in-place placeholder, not a new page, and runs alongside the top loader, not instead of it.
- **StepList** only for a multi-step money action already past Confirm (sending, placing a pie's orders, a private transfer settling): that is progress through real steps the person needs to see, not a loader. Nothing before Confirm uses a step list any more: import's old three-step progress page is gone, and the form it interrupted stays on screen with the top loader running and, once the wait has run long, one quiet line of "still working" text under the button (the same copy the standard would have shown anyway).
- No full-screen spinner, no blocking overlay, no spinner inside a button, and no skeleton for content that is local (activity, settings).
- Nothing appears for the first 300 ms of any wait, so fast responses do not flash. A button that starts a wait is disabled at once; the top loader and the "still working" line follow after that moment.
- Every wait takes its timing and its words from the shared waiting standard (`useWaiting` in `src/ui`): the quiet signal from 300 ms, then a calm "still working" line (after 4 seconds for content, a check or a review; 8 seconds for an action).
- No wait is open-ended. A read that has not answered after 20 seconds counts as failed: the screen says what may be out of date and offers "Try again". A check or a review that has not answered after 20 or 30 seconds ends with a plain message and the form usable again. An action that has not answered after two minutes stops holding its sheet: "This is taking longer than it should. It may still go through, so check the balance and Activity before doing it again." with "Close"; the portfolio stays blocked for a repeat until the chain has settled it (3.3).
- Loading never reads as failure, and a failure never names a request, a service or a timeout.

### 3.12 Haptics

| Moment                                                                                         | Feedback             |
| ---------------------------------------------------------------------------------------------- | -------------------- |
| Selecting a chip, a segment, a portfolio row, a star, a Stepper press, Copy                    | Light impact         |
| Pressing Confirm, entering public view by long press                                           | Medium impact        |
| A landed result, wallet saved, unlock, quiz passed                                             | Success notification |
| Unknown outcome, still settling, a replaced review, a danger notice on a review, opening Reset | Warning notification |
| A refusal, a wrong password, a wrong quiz pick, a failed action                                | Error notification   |
| Typing, scrolling, value changes, price ticks                                                  | None                 |

Haptics follow the system setting and are never the only signal.

### 3.13 Accessibility baseline

- Every control has a label, a role and, where it is not obvious, a hint. Icon buttons are labelled by their action.
- Touch targets are at least 44 by 44pt on iOS and 48 by 48dp on Android.
- Text follows the system text size, including the accessibility sizes. Layouts respond rather than clip: Rows stack label over value, side-by-side buttons stack, sparklines and decorative marks give way first, and the `display` number is capped at twice its default size so it still fits a line.
- Contrast meets AA for body text on base and on surface. The faint tone is used only for secondary text at caption size or larger.
- Focus order matches reading order. On a review, notices and acknowledgements come before Confirm.
- Status changes (a step finishing, a notice appearing, a field error) are announced. Countdowns are not.
- Nothing depends on colour alone, on a long press alone, or on motion.
- Reduced motion replaces the three transitions with instant changes.

### 3.14 Biometric unlock: the mechanism

Biometric unlock is opt-in and off by default.

- **What is stored.** The wallet record is encrypted with a vault key derived from the password. When biometric unlock is turned on, a copy of that vault key, and nothing else, is placed in the device keystore (Keychain on iOS, Keystore on Android) as an item that requires biometric authentication for every read and is bound to the current biometric enrolment. The password is never stored. The recovery phrase is never stored outside the encrypted record.
- **Unlocking.** A successful biometric check makes the keystore release the vault key; the app opens the record with it, exactly as it would with a key derived from the typed password. A failed or cancelled check releases nothing, and the password field is used instead.
- **Password change.** The new password derives a new vault key. The record is sealed again under the new key, the keystore item is replaced with the new key, and the old key and the record sealed under it are deleted. No older usable copy of the record or the key remains on the device. If the replacement fails at any step, the change is rolled back as a whole and the old password still works.
- **New biometric enrolment.** Adding or removing a face or fingerprint makes the system invalidate the stored item. The app detects that the item is gone, falls back to the password, says why (2.10), and offers to turn biometric unlock on again, which stores a fresh item under the new enrolment.
- **Turning it off, and reset.** Both delete the keystore item.
- **What biometrics never do.** They never reveal the recovery phrase and never authorise a password change. Both always require the typed password (2.29, 2.30).

---

## 4. Deliberately not in v1 on mobile

| Not built                                                                                  | Reason                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed Vault and hardware wallet signing                                                     | The wallet derives many keys from one phrase and signs with each. Seed Vault and hardware flows would need a per-portfolio authorisation design and a different unlock model. Until that exists the phrase lives encrypted in the app. |
| Acting as a wallet for other apps (wallet adapter, connection requests, an in-app browser) | Connecting a portfolio to a site hands that site its address, and connecting two hands it the link between them. It also brings signing of transactions the app did not build, which the pre-signing checks are not written for.       |
| Push notifications                                                                         | A push needs a server that knows which device cares about which address or price. No such server exists, and building one would put addresses next to device tokens.                                                                   |
| Home screen and lock screen widgets                                                        | They would show balances outside the unlock gate.                                                                                                                                                                                      |
| Price alerts                                                                               | Need a server and push, as above. The watchlist is the v1 answer.                                                                                                                                                                      |
| Fiat on-ramp                                                                               | A card or bank purchase ties a legal identity to the receiving address at a third party. v1 tells the user to use an exchange they already have and withdraw USDC.                                                                     |
| Recurring or scheduled investing                                                           | Keys exist only while the app is unlocked, so nothing can place an order on the user's behalf.                                                                                                                                         |
| Cloud backup of the phrase or the wallet record                                            | It would move the encrypted wallet to a third party and make the password the only barrier. The paper phrase is the backup. The wallet record is excluded from device backups.                                                         |
| More than one wallet on a device                                                           | One phrase, one funding wallet, many portfolios is the model. A second phrase means reset and import.                                                                                                                                  |
| Limit orders, stop orders                                                                  | No venue support in the shared logic.                                                                                                                                                                                                  |
| Sending to names (for example .sol)                                                        | A name lookup tells a resolver who the user is about to pay, and adds a way to be sent to the wrong place.                                                                                                                             |
| Payment request links and handling `solana:` links from other apps                         | Only an address is taken from a scanned code. A link that prefills an amount or a recipient is a way to trick a user into a send.                                                                                                      |
| Block explorer links and transaction ids                                                   | They put an address or a transaction in a URL handed to a third party.                                                                                                                                                                 |
| Share sheet for addresses or results                                                       | Hands the address to whichever app is picked.                                                                                                                                                                                          |
| Copy for the recovery phrase                                                               | Phone clipboards sync and are readable by keyboards.                                                                                                                                                                                   |
| An address book                                                                            | v1 relies on the first-time and look-alike checks against past sends.                                                                                                                                                                  |
| Export of activity                                                                         | The log holds little, and a file leaving the app is a list of the user's portfolios.                                                                                                                                                   |
| Earn venues other than Jupiter Lend                                                        | One venue is integrated and checked.                                                                                                                                                                                                   |
| Tablet and landscape layouts, a light theme, languages other than English                  | Scope. The app is phone, portrait, dark, English.                                                                                                                                                                                      |
| Watch and car surfaces                                                                     | Scope, and balances outside the gate.                                                                                                                                                                                                  |
| Editing or deleting activity entries, portfolio deletion                                   | The log is a record; a portfolio is an address that cannot stop existing. Archive is the answer.                                                                                                                                       |
| Converting anything to pay network costs                                                   | The product rule: costs are paid in USDC through the relayer or the action is unavailable.                                                                                                                                             |
| Moving, sending or funding with the network's own currency                                 | The phone deals in USDC and trackers only. A portfolio that happens to hold it shows the balance as an ordinary row; it can be moved from the web app.                                                                                 |

---

## 5. Decisions taken and what remains open

### 5.1 Decided by the owner (reflected throughout)

- The phone has no flow, and no string, for the network's own currency. A portfolio that holds it shows an ordinary holding row.
- Network costs are paid in USDC through the relayer and shown in every review; there is no conversion step.
- Warnings about the app itself live on one Risks screen (2.34). Reviews carry one line and a link.
- Usage analytics are on by default with a Switch in Settings, using the web app's closed event list.
- A pending action is stored in the encrypted record and settled on the next unlock.
- Pie orders have no fixed per-order minimum; the smallest amount for a mix is worked out and stated as approximate.
- iOS screenshot protection is best effort and is not promised in copy.
- Earn deposits and withdrawals appear in Activity.
- Biometric unlock is opt-in, with the mechanism in 3.14.
- Results are a step in the sheet, which then closes to the updated screen.
- "Total value" is the aggregate's name. Tabs are Home, Markets, Earn, Activity, Settings.

### 5.2 Still open

1. **Network cost on a trade in an existing holding.** The owner's rule is that every review shows a network cost in USDC. For such a trade the venue places the order and nothing is charged on top, so the spec shows "Included in the fee" rather than a figure that is not charged. Affects 2.20 and 3.1. Recommendation: keep "Included in the fee"; it is the honest value. If a figure must be shown, the shared logic has to supply one that is really paid.
2. **What the lending pool can return right now.** The withdraw review states the returnable amount before confirmation (2.27). That needs the venue to report it when the review is prepared. Recommendation: add that read to the shared Earn logic; until it exists, the notice can only appear after the venue refuses at signing, which is still before anything is charged.
3. **"Not sure" on import when the chain cannot decide.** The spec opens the addresses most other wallets use (2.6). Recommendation: keep; a phrase its owner cannot place most likely came from another wallet, and the result screen offers the other set.

### 5.3 Design input considered and not adopted

- **"Across your portfolios" as the Home label.** The aggregate is called "Total value". The idea is kept in the "Only you see this total" explanation (2.12).
- **Sell beside Buy only when the selected portfolio holds the tracker.** The web logic offers Sell when any portfolio holds it; the sheet's first step lists only the portfolios that hold it.
- **Buying as three separate sheets.** Built as three steps of one sheet, each with one primary action, because a sheet should not present another sheet.
- **A fixed 0.5% fee on the review.** The review shows the fee the live quote carries.
- **Inline results on the underlying screen.** Replaced by the owner's decision: the result is a step in the sheet.
- **Tint beyond the glyph.** Adopted as the identity line (3.9); the token file's comment should name the line as the second and last place a tint appears.

---

## 6. Build order

v1 contains every feature in this document. The order below ships the core loop first: add money, buy, see it, sell. Each stage names what it needs from the stages before it.

| Stage                        | What is built                                                                                                                                                                                                                                           | Depends on                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Shared core contracts     | The wallet record and its encryption; deriving the funding wallet and portfolios; the action contracts (plan, review, confirm, result) for fund, trade, send, Earn and pie orders; the activity log with six kinds; **durable pending outcomes** (3.3). | Nothing. Everything else depends on this.                                                                                                                                                        |
| 2. Platform adapters         | Secure storage and the device keystore (3.14), biometrics, capture protection and the privacy cover (3.6), clipboard rules, camera, haptics, connectivity, the idle and background lock timers (3.4).                                                   | Stage 1, for the record format and the vault key.                                                                                                                                                |
| 3. Onboarding and unlock     | 2.0 to 2.11. In parallel: Markets and Tracker detail, read-only (2.18, 2.19), including visitor mode (2.2).                                                                                                                                             | Stages 1 and 2. Markets needs only the price and catalog reads from stage 1, which is why it can run in parallel.                                                                                |
| 4. Funding                   | Receive (2.15) and Move to portfolio (2.16), with the first review, progress and result steps (3.1, 3.2).                                                                                                                                               | Stage 3 for an unlocked wallet. Establishes the sheet, review and pending patterns every later money flow reuses.                                                                                |
| 5. Trade                     | The trade sheet (2.20), including opening a holding and placing the order under one confirmation.                                                                                                                                                       | Stage 4, because a portfolio needs cash; stage 3's Tracker detail as its entry point; the relayer contract from stage 1.                                                                         |
| 6. Portfolio detail and Home | 2.12, 2.13 with public view, New portfolio (2.14, portfolio only), Portfolio settings (2.17).                                                                                                                                                           | Stages 4 and 5, so the screens compose real balances, holdings and actions rather than placeholders.                                                                                             |
| 7. Send                      | 2.24 with the scanner step.                                                                                                                                                                                                                             | Stage 6 for its entry point; the relayer contract; the recipient checks from stage 1.                                                                                                            |
| 8. Activity and Settings     | 2.22, 2.28, 2.25, 2.29 to 2.34 including Risks.                                                                                                                                                                                                         | Stages 4, 5 and 7 produce the entries Activity lists. Risks must exist before stage 5 ships to users, since the buy review links to it; build its screen early in this stage or pull it forward. |
| 9. Earn                      | 2.26, 2.27.                                                                                                                                                                                                                                             | The relayer contract and the pending pattern; stage 8 for its Activity entries.                                                                                                                  |
| 10. Pies                     | Pie builder (2.23), the pie option in New portfolio, Pie order (2.21), the mix on Portfolio detail.                                                                                                                                                     | Stage 5, because a pie order is a sequence of ordinary trades; stage 6 for where the mix is shown.                                                                                               |

**The riskiest dependency: durable pending-action state.** Every money flow (stages 4, 5, 7, 9, 10) relies on it to stop one decision being carried out twice. It has to be written before the answer to a sent action is awaited, survive a lock and the app being closed, be settled on the next unlock before the same portfolio can confirm anything, and never be cleared by the phone's clock alone. It is built and tested in stage 1, against an action that is sent and then never answered, before any screen that has a confirm button.
