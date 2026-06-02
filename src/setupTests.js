const crypto = require("crypto");
const seedrandom = require("./seedrandom");
const { configure } = require("mobx");

// Allow tests to use jest.spyOn against @action.bound methods. mobx 6 makes them
// non-writable by default, which breaks direct-assignment spies.
configure({ safeDescriptors: false });

// Polyfill crypto.getRandomValues for nanoid (used by @concord-consortium/lara-interactive-api)
if (!global.crypto) {
  global.crypto = {
    getRandomValues: function(buffer) {
      return crypto.randomFillSync(buffer);
    }
  };
}

// React Testing Library matchers (toBeInTheDocument, toHaveClass, etc.)
require("@testing-library/jest-dom");
// The codebase uses `data-test` (not RTL's default `data-testid`); align RTL queries with it.
require("@testing-library/react").configure({ testIdAttribute: "data-test" });

const fetchMock = require("jest-fetch-mock");
fetchMock.enableMocks();
// Default to a non-ok response so SimulationModel's autorun-triggered SST fetch
// short-circuits before PNG parsing (which would otherwise log "Failed to parse
// sea surface temperature PNG" on every test). Tests that need real-looking
// fetch data can opt in via fetchMock.mockResponseOnce(...).
fetchMock.mockResponse("", { status: 404 });

// Initialize seedrandom to deterministic mode, so it's possible to write reasonable tests that use random values.
seedrandom.initialize(true);

// Fix testing of some of the Leaflet elements. JSDOM doesn't fully support SVG.
// See: https://stackoverflow.com/a/54384719/1548350
const createElementNSOrig = global.document.createElementNS;
global.document.createElementNS = function(namespaceURI, qualifiedName) {
  if (namespaceURI === "http://www.w3.org/2000/svg" && qualifiedName === "svg") {
    const element = createElementNSOrig.apply(this, arguments);
    element.createSVGRect = function() {};
    return element;
  }
  return createElementNSOrig.apply(this, arguments);
};
