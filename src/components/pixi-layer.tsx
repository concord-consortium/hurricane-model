import * as React from "react";
import { render } from "react-pixi-fiber";
import * as CanvasLayer from "react-leaflet-canvas-layer";
import {inject, observer} from "mobx-react";
import {BaseComponent} from "./base";

interface IProps {
  children: React.ReactElement<any> | Array<React.ReactElement<any>>;
}
interface IState {}

@inject("stores")
@observer
export class PixiLayer extends BaseComponent<IProps, IState> {
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
        autoStart: false,
        view: info.canvas
      });
    }
    this.pixiApp.renderer.resize(info.canvas.width, info.canvas.height);
    // Use the custom renderer to render react-PIXI objects into a PIXI container.
    render(this.props.children, this.pixiApp.stage);
    this.pixiApp.render();
  }
}
