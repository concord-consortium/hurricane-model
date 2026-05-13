import * as React from "react";
import { render } from "@testing-library/react";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { MapContainer } from "react-leaflet";
import { PressureSystemMarker } from "./pressure-system-marker";

describe("PressureSystemMarker component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders without crashing", () => {
    render(
      <Provider stores={stores}>
        <MapContainer center={[0, 0]} zoom={10}>
          <PressureSystemMarker model={stores.simulation.pressureSystems[0]}/>
        </MapContainer>
      </Provider>
    );
  });

  it("updates pressure center position via setPressureSysCenter", () => {
    const model = stores.simulation.pressureSystems[0];
    stores.simulation.setPressureSysCenter(model, { lat: 20, lng: 30 });
    expect(model.center).toEqual({ lat: 20, lng: 30 });

    // Limit lat to 15, don't let users drag the pressure system to southern hemisphere.
    stores.simulation.setPressureSysCenter(model, { lat: 0, lng: 30 });
    expect(model.center).toEqual({ lat: 15, lng: 30 });
  });
});
