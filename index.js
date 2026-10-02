// The polyfill must run before any module that touches crypto or Buffer, so it
// is the first import and the router entry comes second.
import "./polyfill";
import "expo-router/entry";
