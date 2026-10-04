/**
 * The password strength checker and its dictionaries, imported here so they
 * are part of the app's main bundle. The shared package loads them with
 * `import()`, which a bundler may split into a file fetched on demand: that
 * fetch can resolve to another build of the same package than the one the
 * main bundle names, or fail with no connection. A password must be checked
 * on the phone, offline, every time, so nothing about it is left to a fetch.
 */
import "@zxcvbn-ts/core";
import "@zxcvbn-ts/language-common";
