import { UIModel, UIModelType } from "./ui";

describe("ui model", () => {
  let ui: UIModelType;

  beforeEach(() => {
    ui = UIModel.create({});
  });

  it("has default values", () => {
    expect(ui.sampleText).toBe("Hello World");
  });

  it("uses override values", () => {
    ui = UIModel.create({
      sampleText: "foo"
    });
    expect(ui.sampleText).toBe("foo");
  });

  it("sets new values", () => {
    ui.setSampleText("bar");
    expect(ui.sampleText).toBe("bar");
  });

});
