import { applyAuthoredState } from "./apply-authored-state";
import config from "../config";

describe("apply-authored-state", () => {
  // Store original config values to restore after tests
  const originalConfig = { ...config };

  afterEach(() => {
    // Restore original config values
    Object.assign(config, originalConfig);
  });

  it("does nothing when authoredState is null", () => {
    const originalSeason = config.season;
    applyAuthoredState(null);
    expect(config.season).toBe(originalSeason);
  });

  it("does nothing when urlParams is undefined", () => {
    const originalSeason = config.season;
    applyAuthoredState({ version: 1 });
    expect(config.season).toBe(originalSeason);
  });

  it("does nothing when urlParams is empty string", () => {
    const originalSeason = config.season;
    applyAuthoredState({ version: 1, urlParams: "" });
    expect(config.season).toBe(originalSeason);
  });

  it("applies string parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "season=winter" });
    expect(config.season).toBe("winter");
  });

  it("applies boolean true parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "windArrows=true" });
    expect(config.windArrows).toBe(true);
  });

  it("applies boolean false parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "windArrows=false" });
    expect(config.windArrows).toBe(false);
  });

  it("applies numeric parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "timestep=500" });
    expect(config.timestep).toBe(500);
  });

  it("applies array parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "availableOverlays=[sst,precipitation]" });
    expect(config.availableOverlays).toEqual(["sst", "precipitation"]);
  });

  it("applies empty array parameters", () => {
    applyAuthoredState({ version: 1, urlParams: "availableOverlays=[]" });
    expect(config.availableOverlays).toEqual([]);
  });

  it("applies multiple parameters", () => {
    applyAuthoredState({
      version: 1,
      urlParams: "season=summer&windArrows=false&timestep=200"
    });
    expect(config.season).toBe("summer");
    expect(config.windArrows).toBe(false);
    expect(config.timestep).toBe(200);
  });

  it("applies JSON object parameters", () => {
    const jsonValue = JSON.stringify({ lat: 25, lng: -80 });
    applyAuthoredState({
      version: 1,
      urlParams: `initialHurricanePosition=${jsonValue}`
    });
    expect((config as any).initialHurricanePosition).toEqual({ lat: 25, lng: -80 });
  });
});
