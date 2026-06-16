import { action, computed, observable, makeObservable, reaction, toJS } from "mobx";
import { PNG } from "pngjs";
import { Buffer } from "buffer";
import config from "../config";
import { recolorSSTImage } from "../utils/recolor-sst";
import { temperatureAnomalyRegions } from "../utils/regions";
import { ISSTImages, namedRegions, Season } from "../types";
import { SimulationModel } from "./simulation";

import decSeaTempDefault from "../../sea-surface-temp-img/dec-default.png";
import marchSeaTempDefault from "../../sea-surface-temp-img/mar-default.png";
import juneSeaTempDefault from "../../sea-surface-temp-img/jun-default.png";
import septSeaTempDefault from "../../sea-surface-temp-img/sep-default.png";
import octSeaTempDefault from "../../sea-surface-temp-img/oct-default.png";
import decSeaTempPurple3 from "../../sea-surface-temp-img/dec-purple3.png";
import marchSeaTempPurple3 from "../../sea-surface-temp-img/mar-purple3.png";
import juneSeaTempPurple3 from "../../sea-surface-temp-img/jun-purple3.png";
import septSeaTempPurple3 from "../../sea-surface-temp-img/sep-purple3.png";
import octSeaTempPurple3 from "../../sea-surface-temp-img/oct-purple3.png";
import decSeaTempPurpleCC from "../../sea-surface-temp-img/dec-purpleCC.png";
import marchSeaTempPurpleCC from "../../sea-surface-temp-img/mar-purpleCC.png";
import juneSeaTempPurpleCC from "../../sea-surface-temp-img/jun-purpleCC.png";
import septSeaTempPurpleCC from "../../sea-surface-temp-img/sep-purpleCC.png";
import octSeaTempPurpleCC from "../../sea-surface-temp-img/oct-purpleCC.png";
import decSeaTempRainbowCC from "../../sea-surface-temp-img/dec-rainbowCC.png";
import marchSeaTempRainbowCC from "../../sea-surface-temp-img/mar-rainbowCC.png";
import juneSeaTempRainbowCC from "../../sea-surface-temp-img/jun-rainbowCC.png";
import septSeaTempRainbowCC from "../../sea-surface-temp-img/sep-rainbowCC.png";
import octSeaTempRainbowCC from "../../sea-surface-temp-img/oct-rainbowCC.png";

const RECOLOR_DEBOUNCE_MS = 150;

export const sstImages: Record<string, ISSTImages> = {
  default: {
    winter: decSeaTempDefault,
    spring: marchSeaTempDefault,
    summer: juneSeaTempDefault,
    fall: septSeaTempDefault,
    earlyFall: septSeaTempDefault,
    lateFall: octSeaTempDefault
  },
  rainbowCC: {
    winter: decSeaTempRainbowCC,
    spring: marchSeaTempRainbowCC,
    summer: juneSeaTempRainbowCC,
    fall: septSeaTempRainbowCC,
    earlyFall: septSeaTempRainbowCC,
    lateFall: octSeaTempRainbowCC
  },
  purple3: {
    winter: decSeaTempPurple3,
    spring: marchSeaTempPurple3,
    summer: juneSeaTempPurple3,
    fall: septSeaTempPurple3,
    earlyFall: septSeaTempPurple3,
    lateFall: octSeaTempPurple3
  },
  purpleCC: {
    winter: decSeaTempPurpleCC,
    spring: marchSeaTempPurpleCC,
    summer: juneSeaTempPurpleCC,
    fall: septSeaTempPurpleCC,
    earlyFall: septSeaTempPurpleCC,
    lateFall: octSeaTempPurpleCC
  },
};

export class SSTOverlayModel {
  @observable.ref public visiblePng: PNG | null = null;
  @observable public recoloredUrl: string | null = null;
  @observable public accessibleSSTScale = false;

  private simulation: SimulationModel;
  // Test hook, mirrors simulation._seaSurfaceTempDataParsed.
  public _visiblePngParsed: null | (() => void) = null;

  constructor(simulation: SimulationModel) {
    makeObservable(this);
    this.simulation = simulation;

    // Re-fetch/parse the visible PNG whenever its URL changes.
    reaction(
      () => this.getVisibleSeaSurfaceTempImgUrl(this.simulation.season),
      url => this.loadVisiblePng(url),
      { fireImmediately: true }
    );

    // Recompute the recolored overlay (debounced) when inputs change.
    reaction(
      () => ({
        png: this.visiblePng,
        anomalies: toJS(this.simulation.temperatureAnomalies),
        scale: this.sstScaleName,
      }),
      () => this.recolorNow(),
      { delay: RECOLOR_DEBOUNCE_MS }
    );
  }

  @computed public get sstScaleName() {
    return this.accessibleSSTScale ? config.accessibleSSTScale : config.defaultSSTScale;
  }

  public getVisibleSeaSurfaceTempImgUrl(season: Season) {
    return sstImages[this.sstScaleName][season];
  }

  @computed public get activeRegions() {
    return namedRegions
      .filter(key => this.simulation.temperatureAnomalyAt(key) !== 0)
      .map(key => temperatureAnomalyRegions[key].region);
  }

  @action.bound public setAccessibleSSTScale(enabled: boolean) {
    this.accessibleSSTScale = enabled;
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
      scaleName: this.sstScaleName,
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
