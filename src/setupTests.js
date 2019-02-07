const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
const seedrandom = require("./seedrandom");

enzyme.configure({ adapter: new Adapter() });

global.fetch = require("jest-fetch-mock");

// Initialize seedrandom to deterministic mode, so it's possible to write reasonable tests that use random values.
seedrandom.initialize(true);
