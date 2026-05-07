import * as React from "react";
import CanvasLayer from "./react-leaflet-canvas-layer";
import { autorun } from "mobx";
import {inject, observer} from "mobx-react";
import {BaseComponent, IBaseProps} from "./base";
import * as PIXI from "pixi.js-legacy";
import {IVector, IWindPoint} from "../types";
import { IStores } from "../models/stores";

const vectorWidth = 2;
const arrowHeadSize = 4;
const color = 0xffffff;
const shadow = 0x000000;
const opacity = 1;

// Build the source Graphics at module scope; convert to textures lazily once the
// pixiApp's renderer is available (see ensureTextures).
const lineGraphics = (() => {
  const graph = new PIXI.Graphics();
  const shadowOffset = 1;
  graph.beginFill(shadow);
  graph.drawRect(0, 0, vectorWidth + shadowOffset, 1);
  graph.endFill();
  graph.beginFill(color);
  graph.drawRect(0, 0, vectorWidth, 1);
  graph.endFill();
  return graph;
})();

const arrowGraphics = (() => {
  const graph = new PIXI.Graphics();
  const shadowOffset = 1;
  graph.beginFill(shadow);
  graph.drawPolygon([
    0, 0,
    arrowHeadSize * 0.5 * vectorWidth + shadowOffset, -arrowHeadSize * vectorWidth - shadowOffset,
    arrowHeadSize * vectorWidth + shadowOffset, 0
  ]);
  graph.endFill();
  graph.beginFill(color);
  graph.drawPolygon([
    0, 0,
    arrowHeadSize * 0.5 * vectorWidth, -arrowHeadSize * vectorWidth,
    arrowHeadSize * vectorWidth, 0
  ]);
  graph.endFill();
  return graph;
})();

let lineTexture: PIXI.Texture | null = null;
let arrowTexture: PIXI.Texture | null = null;
function ensureTextures(renderer: PIXI.Renderer | PIXI.AbstractRenderer) {
  if (!lineTexture) {
    lineTexture = renderer.generateTexture(lineGraphics, PIXI.SCALE_MODES.LINEAR, 2);
    lineTexture.defaultAnchor = new PIXI.Point(0.5, 1);
  }
  if (!arrowTexture) {
    arrowTexture = renderer.generateTexture(arrowGraphics, PIXI.SCALE_MODES.LINEAR, 2);
    arrowTexture.defaultAnchor = new PIXI.Point(0.5, 0.5);
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
  // TODO: Better solution for stores.
  // We can't reference it as a prop in the reaction set up in componentDidMount.
  private _stores: IStores | null = null;
  private disposeObserver: null | (() => void) = null;

  public componentDidMount(): void {
    this._stores = this.props.stores ?? null;
    this.disposeObserver = autorun(() => {
      // Use MobX autorun to observe all the store properties that are necessary to update wind arrows.
      this.updateArrows();
    });
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
    if (!this.pixiApp) {
      // Setup PIXI app.
      this.pixiApp = new PIXI.Application({
        width: info.canvas.width,
        height: info.canvas.height,
        transparent: true,
        antialias: true,
        autoStart: false, // do not start animation, render only when necessary
        view: info.canvas,
        resolution: window.devicePixelRatio
      });
      ensureTextures(this.pixiApp.renderer);
      // Add shutterbug support. See: shutterbug-support.ts.
      info.canvas.render = this.pixiApp.render.bind(this.pixiApp);
      info.canvas.classList.add("canvas-3d");
    }
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
      // Try to reuse Pixi arrows.
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
    // Remove unnecessary arrows.
    if (stage.children.length > data.length) {
      stage.removeChildren(data.length);
    }
    this.pixiApp.render();
  }
}
