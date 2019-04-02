import * as Shutterbug from "shutterbug";

export function enableShutterbug(appClassName: string) {
  Shutterbug.enable("." + appClassName);
  Shutterbug.on("saycheese", beforeSnapshotHandler);
}

export function disableShutterbug() {
  Shutterbug.disable();
  Shutterbug.off("saycheese", beforeSnapshotHandler);
}

interface ICanvas3D extends HTMLCanvasElement {
  render: () => void;
}
function beforeSnapshotHandler() {
  // It's necessary re-render 3D canvas when snapshot is taken, so .toDataUrl returns the correct image.
  // In this case, it's most likely the earthquake-canvas-layer which exposes those custom properties
  // (but other canvases can follow this convention in case of need).
  Array.from(document.querySelectorAll(".canvas-3d")).forEach(canvas => {
    if ((canvas as ICanvas3D).render) {
      (canvas as ICanvas3D).render();
    }
  });
}
