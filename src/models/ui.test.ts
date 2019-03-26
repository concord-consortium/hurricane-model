import { UIModel, NorthAtlanticInitialBounds } from "./ui";
import { Map } from "leaflet";

describe("UI model", () => {
  it("can be created without errors", () => {
    const ui = new UIModel();
    expect(ui.initialBounds).toEqual(NorthAtlanticInitialBounds);
    expect(ui.zoomedInView).toEqual(false);
    expect(ui.mapModifiedByUser).toEqual(false);
    expect(ui.latLngToContainerPoint).toBeDefined();
  });

  describe("mapUpdated", () => {
    it("updates latLngToContainerPoint and mapModifiedByUser", () => {
      const ui = new UIModel();
      const map = new Map(document.createElement("div"));
      const oldLatLngToContainerPoint = ui.latLngToContainerPoint;

      ui.mapUpdated(map, true);
      expect(ui.latLngToContainerPoint).not.toEqual(oldLatLngToContainerPoint);
      expect(ui.mapModifiedByUser).toEqual(false);

      ui.mapUpdated(map, false);
      expect(ui.mapModifiedByUser).toEqual(true);
    });
  });

  describe("resetMapView", () => {
    it("updates initialBounds and mapModifiedByUser", () => {
      const ui = new UIModel();
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
      const ui = new UIModel();
      ui.setInitialBounds([[1, 2], [5, 10]]);
      expect(ui.initialBounds).toEqual([[1, 2], [5, 10]]);
    });
  });

  describe("setZoomedInView", () => {
    it("updates initialBounds and zoomedInView props", () => {
      const ui = new UIModel();
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
      const ui = new UIModel();
      ui.setNorthAtlanticView();
      expect(ui.initialBounds).toEqual(NorthAtlanticInitialBounds);
      expect(ui.zoomedInView).toEqual(false);
    });
  });
});
