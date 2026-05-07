// CSS module mock for jest. Mirrors identity-obj-proxy (returns the property name
// as a string for any access), but pretends to be an ES module so that ts-jest's
// `__importStar` returns the proxy as-is rather than copying its own (zero) keys.
// Without this, `import * as css from "./foo.scss"` ends up as `{ default: {} }`.
module.exports = new Proxy({}, {
  get(target, key) {
    if (key === "__esModule") return true;
    if (typeof key === "symbol") return undefined;
    return key;
  },
});
