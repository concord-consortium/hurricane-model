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
    const withGeometry = Array.from(document.querySelectorAll("path")).filter(p => p.getAttribute("d"));
    expect(withGeometry.length).toBeGreaterThanOrEqual(1);
    // The region is a non-interactive visual outline: no leaflet-interactive path means no pointer
    // cursor across the filled area and no click capture — only the real controls respond.
    expect(document.querySelectorAll("path.leaflet-interactive").length).toBe(0);
  });
});
