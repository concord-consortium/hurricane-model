import { Buffer } from "buffer";
import { rgb } from "d3-color";
import { CRS, Point } from "leaflet";
import { action, computed, observable, makeObservable, reaction, toJS } from "mobx";
import { PNG } from "pngjs";
import config from "../config";
import { temperatureAnomalyFeatherHalfWidth } from "../constants";
import { temperatureScale, invertedTemperatureScale, maxTemp, minTemp } from "../temperature-scale";
import { ICoordinates, ISSTImages, namedRegions, Season } from "../types";
import { pixelBoundingBox, Region } from "../utils/region";
import { temperatureAnomalyRegions } from "../utils/regions";
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

interface RecolorParams {
  png: PNG;
  scaleName: string;
  regions: Region[]; // regions whose anomaly is nonzero (used only for bounding-box bounds)
  // Temperature delta (°C) to apply at a coordinate. MUST return 0 for coordinates
  // outside any active region: recolorSSTImage iterates the rectangular bounding box
  // of the regions, so pixels inside the box but outside the (non-rectangular) polygons
  // rely on this returning 0 to be left unchanged.
  getTempDelta: (coords: ICoordinates) => number;
  // Degrees to expand each region's bounding box, so the outside half of a
  // straddling feather band is included. Defaults to 0 (no feather).
  pad?: number;
}

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
  @observable public updatedUrl: string | null = null;
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
      () => this.updateSSTImage(),
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

  @action.bound public setUpdatedUrl(url: string | null) {
    this.updatedUrl = url;
  }

  @action.bound public updateSSTImage() {
    const png = this.visiblePng;
    if (!png || !this.simulation.anyAnomalyActive) {
      this.setUpdatedUrl(null);
      return;
    }
    this.setUpdatedUrl(this.updateSSTImageWithAnomalies({
      png,
      scaleName: this.sstScaleName,
      regions: this.activeRegions,
      getTempDelta: coords => this.simulation.totalAnomalyAt(coords),
      pad: temperatureAnomalyFeatherHalfWidth,
    }));
  }

  private toDataUrl(png: PNG): string {
    return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
  }

  public updateSSTImageWithAnomalies({ png, scaleName, regions, getTempDelta, pad = 0 }: RecolorParams): string {
    const { width, height } = png;
    const out = new PNG({ width, height });
    out.data.set(png.data);

    const zoom = CRS.EPSG3857.zoom(width);
    const box = pixelBoundingBox(regions, zoom, width, height, pad);
    if (!box) return this.toDataUrl(out);

    for (let y = box.minY; y <= box.maxY; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const idx = (width * y + x) << 2;
        if (out.data[idx + 3] === 0) continue; // land

        const coords = CRS.EPSG3857.pointToLatLng(new Point(x, y), zoom);
        const delta = getTempDelta(coords);
        if (delta === 0) continue;

        const baseColor = `rgb(${out.data[idx]}, ${out.data[idx + 1]}, ${out.data[idx + 2]})`;
        const temp = invertedTemperatureScale(baseColor, scaleName);
        if (temp == null) continue;

        const clamped = Math.max(minTemp, Math.min(maxTemp, temp + delta));
        const color = rgb(temperatureScale(clamped, scaleName));
        if (Number.isNaN(color.r)) continue; // unparseable color — leave the base pixel untouched

        out.data[idx] = Math.round(color.r);
        out.data[idx + 1] = Math.round(color.g);
        out.data[idx + 2] = Math.round(color.b);
      }
    }
    return this.toDataUrl(out);
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
