import { categoryLabel } from "./hurricane-categories";

describe("categoryLabel", () => {
  it("labels TS and hurricane categories", () => {
    expect(categoryLabel(0)).toBe("TS");
    expect(categoryLabel(3)).toBe("Cat 3");
  });
});
