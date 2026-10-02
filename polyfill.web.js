import { Buffer } from "buffer";

// A browser already has WebCrypto, so the web export only needs the same
// single Buffer implementation the native entry installs.
globalThis.Buffer = Buffer;
