import * as React from "react";
import { MapView } from "./map-view";
import { render } from "@testing-library/react";
import { createStores, IStores } from "../models/stores";
import { Provider } from "mobx-react";
import { StoresContext } from "../stores-context";
import config from "../config";
import * as logModule from "../log";

jest.spyOn(logModule, "log").mockImplementation(() => undefined);

const createMockLeafletMouseEvent = (
  lat: number, lng: number,
  targetElement?: HTMLElement
) => ({
  latlng: { lat, lng },
  originalEvent: {
    target: targetElement || document.createElement("div")
  }
} as any);

function renderMapView(stores: IStores) {
  return render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <MapView />
      </StoresContext>
    </Provider>
  );
}

describe("MapView component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders without crashing", () => {
    renderMapView(stores);
    // The MapView's outer wrapper has id="mapView". Most map content is rendered by
    // Leaflet outside the React tree (marker panes etc.), so we can't easily assert on
    // it from RTL. Coarse smoke test only — finer-grained map content is exercised by
    // the cypress integration tests.
    expect(document.querySelector("#mapView")).toBeInTheDocument();
  });

  // TODO: previous tests checked that landfall rectangles are handled correctly and
  // that the hurricane doesn't render if it's not active. These should be recreated.

  it("applies noTopBar class when topBarVisible is false", () => {
    const oldTopBarVisible = config.topBarVisible;
    config.topBarVisible = false;
    renderMapView(stores);
    expect(document.querySelector("#mapView")).toHaveClass("noTopBar");
    config.topBarVisible = oldTopBarVisible;
  });

  it("does not apply noTopBar class when topBarVisible is true", () => {
    const oldTopBarVisible = config.topBarVisible;
    config.topBarVisible = true;
    renderMapView(stores);
    expect(document.querySelector("#mapView")).not.toHaveClass("noTopBar");
    config.topBarVisible = oldTopBarVisible;
  });

  describe("storm placement region overlay", () => {
    it("renders the polygon overlay when setupMode is 'stormLocation'", () => {
      stores.ui.setSetupMode("stormLocation");
      renderMapView(stores);
      expect(document.querySelector("path.leaflet-interactive")).not.toBeNull();
    });

    it("does not render the polygon overlay when setupMode is undefined", () => {
      stores.ui.setSetupMode(undefined);
      renderMapView(stores);
      expect(document.querySelector("path.leaflet-interactive")).toBeNull();
    });
  });

  describe("SST overlay url", () => {
    const sstImg = () => document.querySelector("img.leaflet-image-layer") as HTMLImageElement | null;
    // jsdom resolves the relative asset-stub url against the document base when read back
    // via the `src` *property*, so resolve the expected static url the same way to compare.
    const resolved = (url: string) => new URL(url, document.baseURI).href;

    it("uses the static SST image url when no anomaly is active", () => {
      stores.ui.setOverlay("sst");
      renderMapView(stores);
      const staticUrl = stores.ui.sstOverlay.getVisibleSeaSurfaceTempImgUrl(stores.simulation.season);
      const img = sstImg();
      expect(img).not.toBeNull();
      expect(img!.src).toBe(resolved(staticUrl));
    });

    it("uses the recolored data-url when an anomaly is active and recoloredUrl is set", () => {
      stores.ui.setOverlay("sst");
      stores.simulation.adjustTemperatureAnomaly("gulf", 2);
      stores.ui.sstOverlay.setUpdatedUrl("data:image/png;base64,TESTDATA");
      renderMapView(stores);
      const img = sstImg();
      expect(img).not.toBeNull();
      expect(img!.src).toBe("data:image/png;base64,TESTDATA");
    });

    it("falls back to the static url when an anomaly is active but recoloredUrl is null", () => {
      stores.ui.setOverlay("sst");
      stores.simulation.adjustTemperatureAnomaly("gulf", 2);
      stores.ui.sstOverlay.setUpdatedUrl(null);
      expect(stores.simulation.anyAnomalyActive).toBe(true);
      renderMapView(stores);
      const staticUrl = stores.ui.sstOverlay.getVisibleSeaSurfaceTempImgUrl(stores.simulation.season);
      const img = sstImg();
      expect(img).not.toBeNull();
      expect(img!.src).toBe(resolved(staticUrl));
    });
  });

  describe("map click logging via instance handler", () => {
    // The map click and thermometer-move handlers attach to Leaflet via react-leaflet 2's
    // onClick/onMouseMove props. Leaflet events aren't React synthetic events, so RTL
    // can't simulate them through the DOM. Reach into the wrapped component via a ref
    // to invoke the handlers directly (still in Provider context so stores are wired).
    const renderWithRef = () => {
      const ref = React.createRef<any>();
      const Inner = (MapView as any).wrappedComponent;
      // Provider is still needed so child components (HurricaneMarker etc., which use
      // @inject) can read stores from context. Inner itself bypasses @inject so we pass
      // stores as a prop too — BaseComponent.stores reads from this.props.stores.
      render(
        <Provider stores={stores}>
          <StoresContext value={stores}>
            <Inner ref={ref} stores={stores} />
          </StoresContext>
        </Provider>
      );
      return ref.current;
    };

    it("logs MapClicked with lat/lng when thermometer is inactive", () => {
      (logModule.log as jest.Mock).mockClear();
      const mapView = renderWithRef();
      stores.ui.thermometerActive = false;
      mapView.handleMouseClick(createMockLeafletMouseEvent(25.5, -70.3));
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(call).toBeDefined();
      expect(call[1].position).toEqual({ lat: 25.5, lng: -70.3 });
    });

    it("logs ThermometerPinned instead of MapClicked when thermometer is active", () => {
      (logModule.log as jest.Mock).mockClear();
      const mapView = renderWithRef();
      stores.ui.thermometerActive = true;
      jest.spyOn(stores.simulation, "seaSurfaceTempAt").mockReturnValue(28.5);
      mapView.handleMouseClick(createMockLeafletMouseEvent(20.0, -65.0));
      const pinnedCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerPinned"
      );
      expect(pinnedCall).toBeDefined();
      expect(pinnedCall[1].position).toEqual({ lat: 20.0, lng: -65.0 });
      expect(pinnedCall[1].temperature).toBe(28.5);
      const mapClickCall = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(mapClickCall).toBeUndefined();
    });

    it("does not log MapClicked when click is on a marker", () => {
      (logModule.log as jest.Mock).mockClear();
      const mapView = renderWithRef();
      stores.ui.thermometerActive = false;
      const markerPane = document.createElement("div");
      markerPane.className = "leaflet-marker-pane";
      const target = document.createElement("div");
      markerPane.appendChild(target);
      document.body.appendChild(markerPane);
      mapView.handleMouseClick(createMockLeafletMouseEvent(15.0, -50.0, target));
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "MapClicked"
      );
      expect(call).toBeUndefined();
      document.body.removeChild(markerPane);
    });
  });

  describe("thermometer hover logging", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const renderWithRef = () => {
      const ref = React.createRef<any>();
      const Inner = (MapView as any).wrappedComponent;
      render(
        <Provider stores={stores}>
          <StoresContext value={stores}>
            <Inner ref={ref} stores={stores} />
          </StoresContext>
        </Provider>
      );
      return ref.current;
    };

    it("logs ThermometerHover after 1s debounce when thermometer is active", () => {
      (logModule.log as jest.Mock).mockClear();
      const mapView = renderWithRef();
      stores.ui.thermometerActive = true;
      jest.spyOn(stores.simulation, "seaSurfaceTempAt").mockReturnValue(27.3);
      mapView.handleMouseMove(createMockLeafletMouseEvent(22.0, -68.0));

      // Not logged yet at 999ms
      jest.advanceTimersByTime(999);
      expect((logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      )).toBeUndefined();

      // Logged at 1000ms
      jest.advanceTimersByTime(1);
      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      );
      expect(call).toBeDefined();
      expect(call[1].position).toEqual({ lat: 22.0, lng: -68.0 });
      expect(call[1].temperature).toBe(27.3);
    });

    it("does not log ThermometerHover if thermometer is deactivated before timeout", () => {
      (logModule.log as jest.Mock).mockClear();
      const mapView = renderWithRef();
      stores.ui.thermometerActive = true;
      jest.spyOn(stores.simulation, "seaSurfaceTempAt").mockReturnValue(26.0);
      mapView.handleMouseMove(createMockLeafletMouseEvent(18.0, -72.0));

      // Deactivate thermometer before timeout fires
      stores.ui.thermometerActive = false;
      jest.advanceTimersByTime(1000);

      const call = (logModule.log as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "ThermometerHover"
      );
      expect(call).toBeUndefined();
    });
  });
});
