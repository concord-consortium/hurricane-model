import { LogMonitor } from "@concord-consortium/log-monitor";
import CircularProgress from "@mui/material/CircularProgress";
import { inject, observer } from "mobx-react";
import * as React from "react";

import config from "../config";
import { log } from "../log";
import { enableShutterbug, disableShutterbug } from "../shutterbug-support";
import { BaseComponent, IBaseProps } from "./base";
import { BottomBar } from "./bottom-bar/bottom-bar";
import { LeftPanel } from "./left-panel/left-panel";
import { MapView } from "./map-view";
import { RightPanel } from "./right-panel/right-panel";
import { TopBar } from "./top-bar/top-bar";

import css from "./index-page.scss";

interface IProps extends IBaseProps {}
interface IState {
  leftPanelOpen: boolean
}

@inject("stores")
@observer

export class IndexPage extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      leftPanelOpen: false
    };
  }

  public componentDidMount() {
    enableShutterbug(css.index);
  }

  public componentWillUnmount() {
    disableShutterbug();
  }

  public toggleLeftPanelOpen() {
    this.setState({ leftPanelOpen: !this.state.leftPanelOpen });
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
        { config.mode === "storm" && (
          <LeftPanel
            open={this.state.leftPanelOpen}
            toggleOpen={() => this.toggleLeftPanelOpen()}
          />
        )}
        <RightPanel />
        <BottomBar toggleLeftPanelOpen={() => this.toggleLeftPanelOpen()}/>
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
