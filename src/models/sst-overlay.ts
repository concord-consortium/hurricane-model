import { action, computed, observable, makeObservable, reaction, toJS } from "mobx";
import { PNG } from "pngjs";
import { Buffer } from "buffer";
import { SimulationModel } from "./simulation";
import { UIModel } from "./ui";
import { recolorSSTImage } from "../utils/recolor-sst";
import { temperatureAnomalyRegions } from "../utils/regions";
import { namedRegions } from "../types";

const RECOLOR_DEBOUNCE_MS = 150;

export class SSTOverlayModel {
  @observable.ref public visiblePng: PNG | null = null;
  @observable public recoloredUrl: string | null = null;

  private simulation: SimulationModel;
  private ui: UIModel;
  // Test hook, mirrors simulation._seaSurfaceTempDataParsed.
  public _visiblePngParsed: null | (() => void) = null;

  constructor(simulation: SimulationModel, ui: UIModel) {
    makeObservable(this);
    this.simulation = simulation;
    this.ui = ui;

    // Re-fetch/parse the visible PNG whenever its URL changes.
    reaction(
      () => this.ui.getVisibleSeaSurfaceTempImgUrl(this.simulation.season),
      url => this.loadVisiblePng(url),
      { fireImmediately: true }
    );

    // Recompute the recolored overlay (debounced) when inputs change.
    reaction(
      () => ({
        png: this.visiblePng,
        anomalies: toJS(this.simulation.temperatureAnomalies),
        scale: this.ui.sstScaleName,
      }),
      () => this.recolorNow(),
      { delay: RECOLOR_DEBOUNCE_MS }
    );
  }

  @computed public get activeRegions() {
    return namedRegions
      .filter(key => this.simulation.temperatureAnomalyAt(key) !== 0)
      .map(key => temperatureAnomalyRegions[key].region);
  }

  @action.bound public setVisiblePng(png: PNG | null) {
    this.visiblePng = png;
  }

  @action.bound public setRecoloredUrl(url: string | null) {
    this.recoloredUrl = url;
  }

  @action.bound public recolorNow() {
    const png = this.visiblePng;
    if (!png || !this.simulation.anyAnomalyActive) {
      this.setRecoloredUrl(null);
      return;
    }
    this.setRecoloredUrl(recolorSSTImage({
      png,
      scaleName: this.ui.sstScaleName,
      regions: this.activeRegions,
      getTempDelta: coords => this.simulation.totalAnomalyAt(coords),
    }));
  }

  private loadVisiblePng(url: string) {
    // Clear the old PNG while the new one loads. This intentionally lets the recolor
    // reaction fire an extra (cheap, early-returning) time on a season/scale change:
    // it clears the stale recolored image so the map falls back to the freshly-loading
    // base tile, and it keeps `visiblePng` from being recolored against a newly-changed
    // scale's lookup table (which would produce garbage). Anomaly-only changes don't
    // call this, so they fire the recolor reaction exactly once.
    this.setVisiblePng(null);
    fetch(url).then(response => {
      if (!response.ok) return;
      response.arrayBuffer().then(buffer => {
        new PNG().parse(Buffer.from(buffer), (err, png) => {
          if (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to parse visible SST PNG:", err);
            return;
          }
          this.setVisiblePng(png);
          this._visiblePngParsed?.();
        });
      });
    });
  }
}
