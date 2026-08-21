import { createStores } from "./stores";

describe("stores object", () => {
  it("supports creating dummy stores for testing", () => {
    const stores = createStores();
    expect(stores).toBeDefined();
    expect(stores.ui).toBeDefined();
    expect(stores.simulation).toBeDefined();
    expect(stores.runs).toBeDefined();
  });

  it("wires the runs store to the simulation", () => {
    const stores = createStores();
    expect(stores.runs.runs.length).toBe(1);
    expect(stores.runs.runs[0].simulation.season).toBe(stores.simulation.season);
  });
});
