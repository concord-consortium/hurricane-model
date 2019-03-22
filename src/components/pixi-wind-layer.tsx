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

const lineTexture = (() => {
  const graph = new PIXI.Graphics();
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
  graph.beginFill(color);
  graph.drawPolygon([
    0, 0,
    arrowHeadSize * 0.5 * vectorWidth,
    -arrowHeadSize * vectorWidth,
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

  public componentDidMount(): void {
    autorun(() => {
      // Use MobX autorun to observe all the store properties that are necessary to update wind arrows.
      this.updateArrows();
      this.pixiApp!.render();
    });
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
    }
    this.pixiApp.renderer.resize(info.canvas.width, info.canvas.height);
    this.updateArrows();
    this.pixiApp.render();
  }

  private updateArrows() {
    const stage = this.pixiApp!.stage;
    const opacity = this.stores.ui.layerOpacity.windArrows;
    stage.alpha = opacity;
    if (opacity === 0) {
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
  }
}
