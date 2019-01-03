import * as React from "react";
import * as CanvasLayer from "react-leaflet-canvas-layer";
import {inject, observer} from "mobx-react";
import {BaseComponent, IBaseProps} from "./base";
import * as PIXI from "pixi.js";
import {autorun} from "mobx";

const vectorScale = 4;
const vectorWidth = 2;
const arrowHeadSize = 4;

const lineTexture = (() => {
  const graph = new PIXI.Graphics();
  graph.beginFill(0xffffff);
  graph.drawRect(0, 0, vectorWidth, 1);
  graph.endFill();
  const tex = graph.generateCanvasTexture(1, 2);
  // Move anchor to the bottom of this texture.
  tex.defaultAnchor = new PIXI.Point(0.5, 1);
  return tex;
})();

const arrowTexture = (() => {
  const graph = new PIXI.Graphics();
  graph.beginFill(0xffffff);
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

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer
export class PixiWindLayer extends BaseComponent<IProps, IState> {
  private pixiApp: PIXI.Application | null = null;

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
        view: info.canvas
      });
    }
    this.pixiApp.renderer.resize(info.canvas.width, info.canvas.height);
    this.updateArrows();
    this.pixiApp.render();
  }

  private updateArrows() {
    const stage = this.pixiApp!.stage;
    const data = this.stores.simulation.windIncBounds;
    const latLngToContainerPoint = this.stores.simulation.latLngToContainerPoint;
    stage.removeChildren();
    data.forEach((w: any) => {
      const length = vectorScale * Math.sqrt(w.u * w.u + w.v * w.v);
      const lineScale = new PIXI.Point(1, length);
      const point = latLngToContainerPoint([w.lat, w.lng]);
      const rotation = Math.atan2(w.u, w.v);
      const cont = new PIXI.Container();
      cont.x = point.x;
      cont.y = point.y;
      cont.rotation = rotation;
      const line = new PIXI.Sprite(lineTexture);
      line.scale = lineScale;
      cont.addChild(line);
      const arrow = new PIXI.Sprite(arrowTexture);
      arrow.y = -length;
      cont.addChild(arrow);
      stage.addChild(cont);
    });
  }
}
