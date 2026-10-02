import { Buffer } from "buffer";
import { install } from "react-native-quick-crypto";

install();

// install() sets globalThis.Buffer to the crypto module's own bundled
// implementation. The Solana libraries import the `buffer` package, and two
// different Buffer implementations in one bundle break 64-bit reads: a value
// built by one fails the other's instance checks. The global is therefore
// pointed back at the one `buffer` package everything else imports.
globalThis.Buffer = Buffer;
