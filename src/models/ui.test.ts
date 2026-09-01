import { LatLngBounds, Map } from "leaflet";
import config from "../config";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";

describe("UI model", () => {
  it("can be created without errors", () => {
    const ui = new UIModel(new SimulationModel());
    expect(ui.initialBounds).toEqual(config.initialBounds);
    expect(ui.zoomedInView).toEqual(false);
    expect(ui.mapModifiedByUser).toEqual(false);
    expect(ui.latLngToContainerPoint).toBeDefined();
  });

  describe("maxZoom", () => {
    it("should consider both base map and overlay tiles (when tiles are used as overlay)", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMapTiles("street");
      ui.setOverlay(null);
      expect(ui.maxZoom).toEqual(13);
      ui.setMapTiles("street");
      ui.setOverlay("stormSurge");
      expect(ui.maxZoom).toEqual(13);
    });
  });

  describe("mapUpdated", () => {
    it("updates latLngToContainerPoint, mapModifiedByUser, and mapZoom", () => {
      const ui = new UIModel(new SimulationModel());
      const map = new Map(document.createElement("div"));
      // mock bounds
      map.getBounds = () => new LatLngBounds({ lat: -10, lng: -10 }, { lat: 10, lng: 10 });
      map.getZoom = () => 123; // mock zoom
      const oldLatLngToContainerPoint = ui.latLngToContainerPoint;

      ui.mapUpdated(map, true);
      expect(ui.latLngToContainerPoint).not.toEqual(oldLatLngToContainerPoint);
      expect(ui.mapModifiedByUser).toEqual(false);
      expect(ui.mapZoom).toEqual(123);

      ui.mapUpdated(map, false);
      expect(ui.mapModifiedByUser).toEqual(true);
    });
  });

  describe("resetMapView", () => {
    it("updates initialBounds and mapModifiedByUser", () => {
      const ui = new UIModel(new SimulationModel());
      const oldInitialBounds = ui.initialBounds;
      ui.resetMapView();
      // Bounds should be the same, but it should be a newly craeted object, so view code can detect this change.
      expect(ui.initialBounds).not.toBe(oldInitialBounds);
      expect(ui.initialBounds).toEqual(oldInitialBounds);
      expect(ui.mapModifiedByUser).toEqual(false);
    });
  });

  describe("setInitialBounds", () => {
    it("updates initialBounds", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setInitialBounds([[1, 2], [5, 10]]);
      expect(ui.initialBounds).toEqual([[1, 2], [5, 10]]);
    });
  });

  describe("setZoomedInView", () => {
    it("updates initialBounds and zoomedInView props", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setZoomedInView([[30, -85], [35, -80]], 3);
      expect(ui.initialBounds).toEqual([[30, -85], [35, -80]]);
      expect(ui.zoomedInView).toEqual({
        landfallCategory: 3,
        stormSurgeAvailable: true
      });

      // Note that boudns are out of bounds of the region that has storm surge data defined.
      // See: `stormSurgeDataBounds` const in ui.ts.
      ui.setZoomedInView([[1, -80], [5, -80]], 1);
      expect(ui.initialBounds).toEqual([[1, -80], [5, -80]]);
      expect(ui.zoomedInView).toEqual({
        landfallCategory: 1,
        stormSurgeAvailable: false
      });
    });
  });

  describe("setNorthAtlanticView", () => {
    it("updates initialBounds", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setNorthAtlanticView();
      expect(ui.initialBounds).toEqual(config.initialBounds);
      expect(ui.zoomedInView).toEqual(false);
    });
  });

  describe("reset", () => {
    it("resets most of the UI related params", () => {
      const ui = new UIModel(new SimulationModel());
      ui.initialBounds = [[1, 2], [3, 4]];
      ui.setZoomedInView([[30, -85], [35, -80]], 3);
      ui.mapModifiedByUser = true;
      ui.windArrows = false;
      ui.baseMap = "population";
      ui.overlay = "stormSurge";

      ui.reset();

      expect(ui.initialBounds).toEqual(config.initialBounds);
      expect(ui.zoomedInView).toEqual(false);
      expect(ui.mapModifiedByUser).toEqual(false);
      expect(ui.windArrows).toEqual(true);
      expect(ui.baseMap).toEqual("satellite");
      expect(ui.overlay).toEqual("sst");
    });
  });

  describe("leftPanelOpen", () => {
    let originalMode: typeof config.mode;
    beforeEach(() => { originalMode = config.mode; });
    afterEach(() => { config.mode = originalMode; });

    it("starts open in storm mode", () => {
      config.mode = "storm";
      const ui = new UIModel(new SimulationModel());
      expect(ui.leftPanelOpen).toBe(true);
    });

    it("starts closed in hurricane mode", () => {
      config.mode = "hurricane";
      const ui = new UIModel(new SimulationModel());
      expect(ui.leftPanelOpen).toBe(false);
    });
  });

  describe("isPristine", () => {
    it("is true for a freshly created model", () => {
      const ui = new UIModel(new SimulationModel());
      expect(ui.isPristine).toBe(true);
    });

    it("is false once one of the fields reset() restores has changed", () => {
      const changes: ((ui: UIModel) => void)[] = [
        u => u.setInitialBounds([[1, 2], [5, 10]]),
        u => u.setZoomedInView([[30, -85], [35, -80]], 3),
        u => { u.mapModifiedByUser = true; },
        u => u.setWindArrows(!u.windArrows),
        u => u.setMapTiles("street"),
        u => u.setOverlay("precipitation"),
        u => u.setThermometerActive(true),
        u => u.setThermometerPositionSaved([10, -50]),
        u => u.setThermometerPositionHover([10, -50])
      ];
      changes.forEach(change => {
        const ui = new UIModel(new SimulationModel());
        change(ui);
        expect(ui.isPristine).toBe(false);
      });
    });

    it("ignores fields reset() leaves alone", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setLeftPanelOpen(!ui.leftPanelOpen);
      ui.setHurricaneImage(!ui.hurricaneImage);
      ui.setSetupMode("season");
      expect(ui.isPristine).toBe(true);
    });

    it("is true again after reset", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setZoomedInView([[30, -85], [35, -80]], 3);
      ui.mapModifiedByUser = true;
      ui.setWindArrows(!ui.windArrows);
      ui.setMapTiles("street");
      ui.setOverlay("precipitation");
      ui.setThermometerActive(true);
      ui.setThermometerPositionSaved([10, -50]);

      ui.reset();

      expect(ui.isPristine).toBe(true);
    });
  });

  describe("mode and isReportMode", () => {
    it("defaults to runtime mode", () => {
      const ui = new UIModel(new SimulationModel());
      expect(ui.mode).toBe("runtime");
      expect(ui.isReportMode).toBe(false);
    });

    it("setMode updates the mode", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMode("authoring");
      expect(ui.mode).toBe("authoring");
    });

    it("isReportMode returns true for report mode", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMode("report");
      expect(ui.isReportMode).toBe(true);
    });

    it("isReportMode returns true for reportItem mode", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMode("reportItem");
      expect(ui.isReportMode).toBe(true);
    });

    it("isReportMode returns false for runtime mode", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMode("runtime");
      expect(ui.isReportMode).toBe(false);
    });

    it("isReportMode returns false for authoring mode", () => {
      const ui = new UIModel(new SimulationModel());
      ui.setMode("authoring");
      expect(ui.isReportMode).toBe(false);
    });
  });
});
