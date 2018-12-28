import * as React from "react";
import { Sprite } from "@inlet/react-pixi";
import { PixiLayer } from "./pixi-layer";
import { inject, observer } from "mobx-react";
import { BaseComponent, IBaseProps } from "./base";
import * as PIXI from "pixi.js";
import * as decWind from "../../wind-data-json/dec-simple.json";

interface IProps extends IBaseProps {}
interface IState {}

const vectorScale = 2;
const vectorWidth = 2;

const texture = (() => {
  const graph = new PIXI.Graphics();
  graph.beginFill(0xff00);
  graph.drawRect(0, 0, vectorWidth, 1);
  graph.endFill();
  const tex = graph.generateCanvasTexture(1, 2);
  // Move anchor to the bottom of this texture.
  tex.defaultAnchor = new PIXI.Point(0.5, 1);
  return tex;
})();

@inject("stores")
@observer
export class WindArrowsLayer extends BaseComponent<IProps, IState> {
  public render() {

    return (
      <PixiLayer>
        {
          decWind.windVectors.map((w, idx) => {
            const scale = new PIXI.Point(1, vectorScale * Math.sqrt(w.u * w.u + w.v * w.v));
            const point = this.stores.map.latLngToContainerPoint([w.lat, w.lon]);
            const rotation = Math.atan2(w.u, w.v);
            return <Sprite key={idx} texture={texture} x={point.x} y={point.y} scale={scale} rotation={rotation} />;
          })
        }
      </PixiLayer>
    );
  }
}
