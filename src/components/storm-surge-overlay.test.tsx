import * as React from "react";
import { Provider } from "mobx-react";
import { Map } from "react-leaflet";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import {
  StormSurgeOverlay, PuertoRicoBounds, stormSurgeMapTiles, getTilesUrl, getMaskUrl
} from "./storm-surge-overlay";

describe("StormSurgeOverlay component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders without crashing when landfall present", () => {
    stores.simulation.landfalls.push({
      category: 3,
      position: { lat: 28, lng: -83 }
    });
    render(
      <Provider stores={stores}>
        <Map center={[0, 0]} zoom={10}>
          <StormSurgeOverlay />
        </Map>
      </Provider>
    );
  });
});

describe("StormSurgeOverlay URL helpers", () => {
  it("getTilesUrl substitutes the hurricane category", () => {
    expect(getTilesUrl(3)).toEqual(stormSurgeMapTiles.replace("{hurricaneCat}", "3"));
    expect(getTilesUrl(2)).toEqual(stormSurgeMapTiles.replace("{hurricaneCat}", "2"));
  });

  it("getMaskUrl returns undefined inside Puerto Rico bounds (round mask is used by default)", () => {
    const insidePR = {
      lat: PuertoRicoBounds.getSouthWest().lat + 0.01,
      lng: PuertoRicoBounds.getSouthWest().lng + 0.01
    };
    expect(getMaskUrl(insidePR)).toEqual(undefined);
  });

  it("getMaskUrl returns the top-right mask outside Puerto Rico bounds", () => {
    expect(getMaskUrl({ lat: 28, lng: -83 })).not.toEqual(undefined);
  });
});
