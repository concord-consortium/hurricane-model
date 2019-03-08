const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
const seedrandom = require("./seedrandom");

enzyme.configure({ adapter: new Adapter() });

global.fetch = require("jest-fetch-mock");

// Initialize seedrandom to deterministic mode, so it's possible to write reasonable tests that use random values.
seedrandom.initialize(true);

// Fix testing of some of the Leaflet elements. JSDOM doesn't fully support SVG.
// See: https://stackoverflow.com/a/54384719/1548350
const createElementNSOrig = global.document.createElementNS;
global.document.createElementNS = function (namespaceURI, qualifiedName) {
  if (namespaceURI === 'http://www.w3.org/2000/svg' && qualifiedName === 'svg') {
    const element = createElementNSOrig.apply(this, arguments);
    element.createSVGRect = function () {};
    return element;
  }
  return createElementNSOrig.apply(this, arguments);
}
