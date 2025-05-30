import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { SeasonButton } from "./season-button";
import { WindArrowsToggle } from "./wind-arrows-toggle";
import { HurricaneImageToggle } from "./hurricane-image-toggle";
import { HurricaneScale } from "./hurricane-scale";
import CCLogo from "../assets/cc-logo.svg";
import CCLogoSmall from "../assets/cc-logo-small.svg";
import config from "../config";
import screenfull from "screenfull";
import Button from "@material-ui/core/Button";
import PauseIcon from "../assets/pause.svg";
import StartIcon from "../assets/start.svg";
import ReloadIcon from "../assets/reload.svg";
import RestartIcon from "../assets/restart.svg";
import ThermometerIcon from "../assets/thermometer.svg";
import ThermometerHoverIcon from "../assets/thermometer-hover.svg";
import { log } from "@concord-consortium/lara-interactive-api";
import { IconButton } from "./icon-button";
import { StartLocationButton } from "./start-location-button";
import * as css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {
  fullscreen: boolean;
  isSeasonMenuOpen: boolean;
  isStartLocationMenuOpen: boolean;
}

function toggleFullscreen() {
  if (!screenfull) {
    return;
  }
  if (!screenfull.isFullscreen) {
    screenfull.request();
    log("FullscreenEnabled");
  } else {
    screenfull.exit();
    log("FullscreenDisabled");
  }
}

@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      fullscreen: false,
      isSeasonMenuOpen: false,
      isStartLocationMenuOpen: false
    };
  }

  get fullscreenIconStyle() {
    return css.fullscreenIcon + (this.state.fullscreen ? ` ${css.fullscreen}` : "");
  }

  public componentDidMount() {
    if (screenfull && screenfull.enabled) {
      document.addEventListener(screenfull.raw.fullscreenchange, this.fullscreenChange);
    }
  }

  public componentWillUnmount() {
    if (screenfull && screenfull.enabled) {
      document.removeEventListener(screenfull.raw.fullscreenchange, this.fullscreenChange);
    }
  }

  public render() {
    const sim = this.stores.simulation;
    const ui = this.stores.ui;
    const { isSeasonMenuOpen, isStartLocationMenuOpen } = this.state;
    const startLocationButtonHoveredClass = isStartLocationMenuOpen ? css.hovered : "";
    const seasonButtonHoveredClass = isSeasonMenuOpen ? css.hovered : "";
    const tempButtonDisabled = ui.overlay !== "sst";
    const startLocationButtonDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    const seasonButtonDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    return (
      <div className={css.bottomBar}>
        <div className={css.leftContainer}>
          <CCLogo className={css.logo} />
          <CCLogoSmall className={css.logoSmall} />
        </div>
        <div className={css.mainContainer}>
          {
            config.startLocationButton &&
            <div
              className={`${css.widgetGroup} ${startLocationButtonDisabled ? "" : "hoverable"} ${startLocationButtonHoveredClass}`}
            >
              <StartLocationButton
                onMenuOpen={() => this.setState({ isStartLocationMenuOpen: true })}
                onMenuClose={() => {
                  // delay to avoid flash between closing menu and :hover taking over
                  setTimeout(() => this.setState({ isStartLocationMenuOpen: false }), 500);
                }} />
            </div>
          }
          {
            config.seasonButton &&
            <div
              className={`${css.widgetGroup} ${seasonButtonDisabled ? "" : "hoverable"} ${seasonButtonHoveredClass}`}
            >
              <SeasonButton
                onMenuOpen={() => this.setState({ isSeasonMenuOpen: true })}
                onMenuClose={() => {
                  // delay to avoid flash between closing menu and :hover taking over
                  setTimeout(() => this.setState({ isSeasonMenuOpen: false }), 500);
                }} />
            </div>
          }
          <div className={`${css.widgetGroup} hoverable`}>
            {
              config.windArrowsToggle &&
              <WindArrowsToggle />
            }
          </div>
          <div className={`${css.widgetGroup} hoverable`}>
            {
              config.hurricaneImageToggle &&
              <HurricaneImageToggle />
            }
          </div>
          <div className={`${css.widgetGroup} ${tempButtonDisabled ? "" : "hoverable"}`}>
              <IconButton
                disabled={tempButtonDisabled}
                active={ui.thermometerActive}
                buttonText="Temp"
                dataTest="temp-button"
                icon={<ThermometerIcon />} highlightIcon={<ThermometerHoverIcon />}
                onClick={this.handleThermometerToggle}
              />
          </div>
          <div className={`${css.widgetGroup} ${css.reloadRestart}`}>
            <Button
              className={css.playbackButton}
              data-test="reload-button"
              onClick={this.handleReload}
              disableRipple={true}
            >
              <span><ReloadIcon/> Reload</span>
            </Button>
            <Button
              className={css.playbackButton}
              data-test="restart-button"
              onClick={this.handleRestart}
              disableRipple={true}
            >
              <span><RestartIcon/> Restart</span>
            </Button>
          </div>
          <div className={`${css.widgetGroup} ${css.stopStart}`}>
            <Button
              onClick={this.handleStartStop}
              disabled={!sim.ready}
              className={css.playbackButton}
              data-test="start-button"
              disableRipple={true}
            >
              { sim.simulationRunning ? <span><PauseIcon/> Stop</span> : <span><StartIcon /> Start</span> }
            </Button>
          </div>
          <div className={css.widgetGroup}>
            <HurricaneScale />
          </div>
        </div>
        {/* This empty container is necessary so the spacing works correctly */}
        <div className={css.rightContainer}>
          {
            screenfull && screenfull.enabled &&
            <div className={this.fullscreenIconStyle} onClick={toggleFullscreen} title="Toggle Fullscreen" />
          }
        </div>
      </div>
    );
  }

  public fullscreenChange = () => {
    this.setState({ fullscreen: screenfull && screenfull.isFullscreen });
  }

  public handleStartStop = () => {
    if (this.stores.simulation.simulationRunning) {
      this.stores.simulation.stop();
      log("SimulationStopped");
    } else {
      this.stores.simulation.start();
      log("SimulationStarted");
    }
  }

  public handleRestart = () => {
    this.stores.simulation.restart();
    this.stores.ui.setNorthAtlanticView();
    log("SimulationRestarted");
  }

  public handleReload = () => {
    this.stores.simulation.reset();
    this.stores.ui.reset();
    log("SimulationReloaded");
  }

  public handleThermometerToggle = () => {
    const newValue = !this.stores.ui.thermometerActive;
    this.stores.ui.setThermometerActive(newValue);
    if (newValue) {
      log("ThermometerEnabled");
    } else {
      log("ThermometerDisabled");
    }
  }
}
