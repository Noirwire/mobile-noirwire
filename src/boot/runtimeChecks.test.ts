import { Buffer } from "buffer";
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import { failedRuntimeChecks } from "./runtimeChecks";

type Runtime = NonNullable<Parameters<typeof failedRuntimeChecks>[0]>;

const working = {
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  URL,
  atob: (text: string) => Buffer.from(text, "base64").toString("binary"),
  btoa: (text: string) => Buffer.from(text, "binary").toString("base64"),
} as unknown as Runtime;

describe("failedRuntimeChecks", () => {
  it("passes a runtime where everything works", async () => {
    expect(await failedRuntimeChecks(working)).toEqual([]);
  });

  it("names randomness that returns zeros", async () => {
    const crypto = { subtle: webcrypto.subtle, getRandomValues: (bytes: Uint8Array) => bytes };
    expect(await failedRuntimeChecks({ ...working, crypto } as unknown as Runtime)).toEqual([
      "crypto.getRandomValues",
    ]);
  });

  it("names a missing subtle crypto", async () => {
    const crypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
    expect(await failedRuntimeChecks({ ...working, crypto } as unknown as Runtime)).toEqual([
      "crypto.subtle",
    ]);
  });

  it("names encryption that returns the wrong bytes", async () => {
    const subtle = {
      importKey: webcrypto.subtle.importKey.bind(webcrypto.subtle),
      deriveKey: webcrypto.subtle.deriveKey.bind(webcrypto.subtle),
      decrypt: webcrypto.subtle.decrypt.bind(webcrypto.subtle),
      encrypt: async () => new ArrayBuffer(21),
    };
    const crypto = { subtle, getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
    expect(await failedRuntimeChecks({ ...working, crypto } as unknown as Runtime)).toEqual([
      "crypto.subtle",
    ]);
  });

  it("names missing text coding", async () => {
    const broken = { ...working, TextEncoder: undefined, TextDecoder: undefined };
    expect(await failedRuntimeChecks(broken as unknown as Runtime)).toEqual([
      "crypto.subtle",
      "TextEncoder",
      "TextDecoder",
    ]);
  });

  it("names a URL that does not parse", async () => {
    class BrokenUrl {
      hostname = "";
    }
    expect(await failedRuntimeChecks({ ...working, URL: BrokenUrl } as unknown as Runtime)).toEqual(
      ["URL"],
    );
  });

  it("names base64 that does not round trip", async () => {
    const broken = { ...working, btoa: () => "" };
    expect(await failedRuntimeChecks(broken as unknown as Runtime)).toEqual(["atob and btoa"]);
  });

  it("names a normalize that leaves text as it was", async () => {
    const normalize = jest.spyOn(String.prototype, "normalize").mockImplementation(function (
      this: string,
    ) {
      return String(this);
    });
    expect(await failedRuntimeChecks(working)).toEqual(["String.prototype.normalize"]);
    normalize.mockRestore();
  });

  it("names a recovery phrase seed that is worked out wrongly", async () => {
    expect(await failedRuntimeChecks(working, () => new Uint8Array(64))).toEqual([
      "Recovery phrase seed",
    ]);
  });
});
