import { PNG } from "pngjs";
import { rgb } from "d3-color";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";
import { SSTOverlayModel } from "./sst-overlay";
import { temperatureScale } from "../temperature-scale";

function makeOpaquePng(width: number, height: number) {
  const png = new PNG({ width, height });
  const c = rgb(temperatureScale(20, "default"));
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = c.r; png.data[i + 1] = c.g; png.data[i + 2] = c.b; png.data[i + 3] = 255;
  }
  return png;
}

it("produces a data-URL when an anomaly is active", () => {
  const simulation = new SimulationModel();
  const ui = new UIModel();
  const overlay = new SSTOverlayModel(simulation, ui);

  overlay.setVisiblePng(makeOpaquePng(128, 128));
  simulation.temperatureAnomalies.set("gulf", 2);
  overlay.recolorNow();

  expect(overlay.recoloredUrl?.startsWith("data:image/png;base64,")).toBe(true);
});

it("clears the recolored URL when no anomaly is active", () => {
  const simulation = new SimulationModel();
  const ui = new UIModel();
  const overlay = new SSTOverlayModel(simulation, ui);

  overlay.setVisiblePng(makeOpaquePng(128, 128));
  overlay.recolorNow();

  expect(overlay.recoloredUrl).toBeNull();
});
