import * as React from "react";
import { render } from "@testing-library/react";
import { MapContainer } from "react-leaflet";
import { PolygonRegion } from "./polygon-region";
import { createRegion } from "../utils/region";
import { FeatureCollection } from "geojson";

const unitSquare: FeatureCollection = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
  }]
};

describe("PolygonRegion component", () => {
  it("renders without crashing inside a MapContainer", () => {
    const region = createRegion(unitSquare);
    const pathOptions = { color: "red", weight: 2, fillColor: "red", fillOpacity: 0.1 };
    render(
      <MapContainer center={[0, 0]} zoom={2}>
        <PolygonRegion region={region} pathOptions={pathOptions} />
      </MapContainer>
    );
    // react-leaflet renders polygons as SVG paths inside the leaflet overlay pane.
    const paths = document.querySelectorAll("path.leaflet-interactive");
    expect(paths.length).toBe(1);
    expect(paths[0].getAttribute("d")).toBeTruthy();
  });
});
