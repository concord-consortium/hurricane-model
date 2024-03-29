import * as React from "react";
import CanvasLayer from "./react-leaflet-canvas-layer";
import {inject, observer} from "mobx-react";
import {BaseComponent, IBaseProps} from "./base";
import * as PIXI from "pixi.js";
import {autorun} from "mobx";
import {IVector, IWindPoint} from "../types";

const vectorWidth = 2;
const arrowHeadSize = 4;
const color = 0xffffff;
const shadow = 0x000000;
const opacity = 1;

const lineTexture = (() => {
  const graph = new PIXI.Graphics();
  const shadowOffset = 1;
  graph.beginFill(shadow);
  graph.drawRect(0, 0, vectorWidth + shadowOffset, 1);
  graph.endFill();
  graph.beginFill(color);
  graph.drawRect(0, 0, vectorWidth, 1);
  graph.endFill();
  const tex = graph.generateCanvasTexture(1, 2);
  // Move anchor to the bottom of this texture.
  tex.defaultAnchor = new PIXI.Point(0.5, 1);
  return tex;
})();

const arrowTexture = (() => {
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
  const tex = graph.generateCanvasTexture(2, 2);
  // Move anchor to the bottom of this texture.
  tex.defaultAnchor = new PIXI.Point(0.5, 0.5);
  return tex;
})();

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
  private disposeObserver: () => void;

  public componentDidMount(): void {
    this.disposeObserver = autorun(() => {
      // Use MobX autorun to observe all the store properties that are necessary to update wind arrows.
      this.updateArrows();
    });
  }

  public componentWillUnmount(): void {
    this.disposeObserver();
  }

  public render() {
    return (
      <CanvasLayer drawMethod={this.drawCanvas}/>
    );
  }

  private drawCanvas = (info: any) => {
    if (!this.pixiApp) {
      // Setup PIXI app.
      this.pixiApp = new PIXI.Application(info.canvas.width, info.canvas.height, {
        transparent: true,
        antialias: true,
        autoStart: false, // do not start animation, render only when necessary
        view: info.canvas,
        resolution: window.devicePixelRatio
      });
      // Add shutterbug support. See: shutterbug-support.ts.
      info.canvas.render = this.pixiApp.render.bind(this.pixiApp);
      info.canvas.classList.add("canvas-3d");
    }
    this.pixiApp.renderer.resize(parseInt(info.canvas.style.width, 10), parseInt(info.canvas.style.height, 10));
    this.pixiApp.render();
  }

  private updateArrows() {
    if (!this.pixiApp) return;
    const stage = this.pixiApp.stage;
    const enabled = this.stores.ui.windArrows;
    stage.alpha = enabled ? opacity : 0;
    if (!enabled) {
      this.pixiApp.render();
      return;
    }
    const data = this.stores.simulation.windIncHurricane;
    const latLngToContainerPoint = this.stores.ui.latLngToContainerPoint;
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
      const line = updateOnly ? arrowContainer.children[0] : new PIXI.Sprite(lineTexture);
      line.scale = lineScale;
      const arrow = updateOnly ? arrowContainer.children[1] : new PIXI.Sprite(arrowTexture);
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
