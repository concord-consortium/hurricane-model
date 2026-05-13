import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { MapView } from "./map-view";
import { BottomBar } from "./bottom-bar";
import { TopBar } from "./top-bar";
import { RightPanel } from "./right-panel";
import { LogMonitor } from "@concord-consortium/log-monitor";
import CircularProgress from "@mui/material/CircularProgress";
import { enableShutterbug, disableShutterbug } from "../shutterbug-support";
import { log } from "../log";
import config from "../config";

import css from "./index-page.scss";

interface IProps extends IBaseProps {}
interface IState {}

@inject("stores")
@observer

export class IndexPage extends BaseComponent<IProps, IState> {
  public componentDidMount() {
    enableShutterbug(css.index);
  }

  public componentWillUnmount() {
    disableShutterbug();
  }

  public render() {
    const loading = this.stores.simulation.loading;
    const content = (
      <>
        {config.topBarVisible && <TopBar />}
        {
          loading &&
          <CircularProgress className={css.progress} size={100} thickness={5} color="inherit" />
        }
        <MapView />
        <RightPanel />
        <BottomBar />
        {
          config.benchmark &&
          <div className={css.stepsPerSecond}>
            Steps per second: { this.stores.simulation.stepsPerSecond.toFixed(1) }
          </div>
        }
      </>
    );

    return (
      <div
        className={css.index}
        data-test="index-page"
        style={config.logMonitor ? { display: "flex" } : undefined}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        {config.logMonitor
          ? <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{content}</div>
          : content
        }
        {config.logMonitor && <LogMonitor logFilePrefix="hurricane-log-events" />}
      </div>
    );
  }

  private getMousePosition(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      clientX: e.clientX,
      clientY: e.clientY,
      percentX: rect.width > 0 ? Math.round(((e.clientX - rect.left) / rect.width) * 100) : 0,
      percentY: rect.height > 0 ? Math.round(((e.clientY - rect.top) / rect.height) * 100) : 0
    };
  }

  private handleMouseEnter = (e: React.MouseEvent) => {
    log("SimulationMouseEnter", this.getMousePosition(e));
  }

  private handleMouseLeave = (e: React.MouseEvent) => {
    log("SimulationMouseLeave", this.getMousePosition(e));
  }

  // Known limitation: When logMonitor is enabled, SimulationMouseEnter/Leave events
  // track the entire container (including the sidebar). This is acceptable since
  // logMonitor is a developer-only tool and won't be active during student sessions.
}
