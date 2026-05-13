import * as React from "react";
import { CanvasLayer } from "./react-leaflet-canvas-layer";
import { autorun } from "mobx";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import * as PIXI from "pixi.js";
import { IVector, IWindPoint } from "../types";
import { IStores } from "../models/stores";

const vectorWidth = 2;
const arrowHeadSize = 4;
const color = 0xffffff;
const shadow = 0x000000;
const opacity = 1;

// Build textures from a 2D canvas rather than from PIXI.Graphics. The shapes are
// trivial (solid-color rect + triangle) and PIXI.Graphics-to-texture went through
// pixi's batch system, which crashes on un-rendered Graphics in v6.
function colorToCss(c: number) {
  return `#${c.toString(16).padStart(6, "0")}`;
}

function buildLineCanvas() {
  const shadowOffset = 1;
  const w = vectorWidth + shadowOffset;
  const h = 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = colorToCss(shadow);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colorToCss(color);
  ctx.fillRect(0, 0, vectorWidth, h);
  return canvas;
}

function buildArrowCanvas() {
  const shadowOffset = 1;
  const headW = arrowHeadSize * vectorWidth + shadowOffset;
  const headH = arrowHeadSize * vectorWidth + shadowOffset;
  const canvas = document.createElement("canvas");
  canvas.width = headW;
  canvas.height = headH;
  const ctx = canvas.getContext("2d")!;
  // Source coordinates use y-up, with the apex at -arrowHeadSize * vectorWidth.
  // Translate so the canvas covers [0,0]..[headW, headH], with the base at the bottom.
  ctx.translate(0, headH);
  // Shadow polygon
  ctx.fillStyle = colorToCss(shadow);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(arrowHeadSize * 0.5 * vectorWidth + shadowOffset, -arrowHeadSize * vectorWidth - shadowOffset);
  ctx.lineTo(arrowHeadSize * vectorWidth + shadowOffset, 0);
  ctx.closePath();
  ctx.fill();
  // Foreground polygon
  ctx.fillStyle = colorToCss(color);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(arrowHeadSize * 0.5 * vectorWidth, -arrowHeadSize * vectorWidth);
  ctx.lineTo(arrowHeadSize * vectorWidth, 0);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

let lineTexture: PIXI.Texture | null = null;
let arrowTexture: PIXI.Texture | null = null;
function ensureTextures() {
  if (!lineTexture) {
    const source = new PIXI.CanvasSource({ resource: buildLineCanvas(), scaleMode: "linear" });
    lineTexture = new PIXI.Texture({ source, defaultAnchor: { x: 0.5, y: 1 } });
  }
  if (!arrowTexture) {
    const source = new PIXI.CanvasSource({ resource: buildArrowCanvas(), scaleMode: "linear" });
    arrowTexture = new PIXI.Texture({ source, defaultAnchor: { x: 0.5, y: 0.5 } });
  }
}

// Use this function to tweak visual length of the wind arrows.
const arrowLengthFunc = (vec: IVector) => {
  return Math.pow(4 * Math.sqrt(vec.u * vec.u + vec.v * vec.v), 0.55) + 4;
};

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class PixiWindLayer extends BaseComponent<IProps, IState> {
  public pixiApp: PIXI.Application | null = null;
  private pixiAppInit: Promise<PIXI.Application> | null = null;
  // TODO: Better solution for stores.
  // We can't reference it as a prop in the reaction set up in componentDidMount.
  private _stores: IStores | null = null;
  private disposeObserver: null | (() => void) = null;

  public componentDidMount(): void {
    this._stores = this.props.stores ?? null;
  }

  public componentWillUnmount(): void {
    this.disposeObserver?.();
  }

  public componentDidUpdate(): void {
    this._stores = this.props.stores ?? null;
  }

  public render() {
    return (
      <CanvasLayer drawMethod={this.drawCanvas}/>
    );
  }

  private drawCanvas = (info: any) => {
    if (!this.pixiAppInit) {
      const app = new PIXI.Application();
      this.pixiAppInit = app.init({
        width: info.canvas.width,
        height: info.canvas.height,
        antialias: true,
        backgroundAlpha: 0,
        canvas: info.canvas,
        resolution: window.devicePixelRatio,
        autoStart: false
      }).then(() => {
        this.pixiApp = app;
        ensureTextures();

        // Add shutterbug support. See: shutterbug-support.ts.
        info.canvas.render = app.render.bind(app);
        info.canvas.classList.add("canvas-3d");
        app.renderer.resize(parseInt(info.canvas.style.width, 10), parseInt(info.canvas.style.height, 10));

        // Use MobX autorun to observe all the store properties that are necessary to update wind arrows.
        this.disposeObserver = autorun(() => this.updateArrows());

        return app;
      });
      // TODO: Catch and properly handle errors if pixi fails to init.
      return;
    }

    if (!this.pixiApp) return; // init still pending

    this.pixiApp.renderer.resize(parseInt(info.canvas.style.width, 10), parseInt(info.canvas.style.height, 10));
    this.pixiApp.render();
  }

  private updateArrows() {
    if (!this.pixiApp || !this._stores || !lineTexture || !arrowTexture) return;
    const stage = this.pixiApp.stage;
    const enabled = this._stores.ui.windArrows;
    stage.alpha = enabled ? opacity : 0;
    if (!enabled) {
      this.pixiApp.render();
      return;
    }
    // Capture in locals so TS preserves narrowing inside the forEach closure.
    const lineTex = lineTexture;
    const arrowTex = arrowTexture;
    const data = this._stores.simulation.windIncHurricane;
    const latLngToContainerPoint = this._stores.ui.latLngToContainerPoint;
    data.forEach((w: IWindPoint, idx: number) => {
      // Reuse Pixi arrows when possible.
      const updateOnly = !!stage.children[idx];
      const arrowContainer = updateOnly ? (stage.children[idx] as PIXI.Container) : new PIXI.Container();
      const length = arrowLengthFunc(w);
      const lineScale = new PIXI.Point(1, length);
      const point = latLngToContainerPoint([w.lat, w.lng]);
      const rotation = Math.atan2(w.u, w.v);
      arrowContainer.x = point.x;
      arrowContainer.y = point.y;
      arrowContainer.rotation = rotation;
      const line = updateOnly ? arrowContainer.children[0] : new PIXI.Sprite(lineTex);
      line.scale = lineScale;
      const arrow = updateOnly ? arrowContainer.children[1] : new PIXI.Sprite(arrowTex);
      arrow.y = -length;
      if (!updateOnly) {
        arrowContainer.addChild(line);
        arrowContainer.addChild(arrow);
        stage.addChild(arrowContainer);
      }
    });
    // Remove excess arrows.
    if (stage.children.length > data.length) {
      stage.removeChildren(data.length);
    }
    this.pixiApp.render();
  }
}
