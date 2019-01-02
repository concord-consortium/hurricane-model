import { createStores } from "./stores";

describe("stores object", () => {

  it("supports creating dummy stores for testing", () => {
    const stores = createStores();
    expect(stores).toBeDefined();
    expect(stores.ui).toBeDefined();
  });

});
