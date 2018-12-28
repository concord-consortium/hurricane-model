import * as React from "react";
import { render } from "@inlet/react-pixi";
import * as CanvasLayer from "react-leaflet-canvas-layer";

interface IProps {
  children: React.ReactElement<any> | Array<React.ReactElement<any>>;
}
interface IState {}

export class PixiLayer extends React.PureComponent<IProps, IState> {
  private pixiApp: PIXI.Application | null = null;

  public render() {
    return (
      <CanvasLayer drawMethod={this.drawCanvas} />
    );
  }

  private drawCanvas = (info: any) => {
    if (!this.pixiApp) {
      // Setup PIXI app.
      this.pixiApp = new PIXI.Application(info.canvas.width, info.canvas.height, {
        transparent: true,
        antialias: true,
        view: info.canvas
      });
    }
    this.pixiApp.renderer.resize(info.canvas.width, info.canvas.height);
    // Use the custom renderer to render react-PIXI objects into a PIXI container.
    render(this.props.children, this.pixiApp.stage);
  }
}
