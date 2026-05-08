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
import Button from "@mui/material/Button";
import PauseIcon from "../assets/pause.svg";
import StartIcon from "../assets/start.svg";
import ReloadIcon from "../assets/reload.svg";
import RestartIcon from "../assets/restart.svg";
import ThermometerIcon from "../assets/thermometer.svg";
import ThermometerHoverIcon from "../assets/thermometer-hover.svg";
import { log } from "../log";
import { IconButton } from "./icon-button";
import { StartLocationButton } from "./start-location-button";
import css from "./bottom-bar.scss";

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
    if (screenfull && screenfull.isEnabled) {
      document.addEventListener(screenfull.raw.fullscreenchange, this.fullscreenChange);
    }
  }

  public componentWillUnmount() {
    if (screenfull && screenfull.isEnabled) {
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
    const isReportMode = ui.isReportMode;
    const startLocationButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);
    const seasonButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && sim.simulationStarted);
    const simulationControlsDisabled = isReportMode;
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
              disabled={simulationControlsDisabled}
              disableRipple={true}
            >
              <span><ReloadIcon/> Reload</span>
            </Button>
            <Button
              className={css.playbackButton}
              data-test="restart-button"
              onClick={this.handleRestart}
              disabled={simulationControlsDisabled}
              disableRipple={true}
            >
              <span><RestartIcon/> Restart</span>
            </Button>
          </div>
          <div className={`${css.widgetGroup} ${css.stopStart}`}>
            <Button
              onClick={this.handleStartStop}
              disabled={simulationControlsDisabled || !sim.ready}
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
            screenfull && screenfull.isEnabled &&
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
      log("SimulationStopped", {
        outcome: this.stores.simulation.getOutcomeData()
      });
    } else {
      const sim = this.stores.simulation;
      const ui = this.stores.ui;
      // Log before start() to capture the exact state the student sees before simulation begins,
      // consistent with SimulationEnded logging before restart/reset.
      log("SimulationStarted", {
        startLocation: sim.startLocation,
        season: sim.season,
        windArrows: ui.windArrows,
        hurricaneImage: ui.hurricaneImage,
        baseMap: ui.baseMap,
        overlay: ui.overlay,
        accessibleSSTScale: ui.accessibleSSTScale,
        thermometerActive: ui.thermometerActive,
        pressureSystems: sim.pressureSystems.map(ps => ({
          type: ps.type,
          center: { lat: ps.center.lat, lng: ps.center.lng },
          strength: ps.strength
        })),
        hurricane: {
          strength: sim.hurricane.strength,
          center: { lat: sim.hurricane.center.lat, lng: sim.hurricane.center.lng }
        },
        deterministic: config.deterministic,
        timestep: config.timestep,
        pressureSystemsLocked: config.pressureSystemsLocked,
        lockSimulationWhileRunning: config.lockSimulationWhileRunning,
        seaSurfaceTempOpacity: config.seaSurfaceTempOpacity,
        markLandfalls: config.markLandfalls
      });
      this.stores.simulation.start();
    }
  }

  public handleRestart = () => {
    log("SimulationEnded", {
      reason: "SimulationRestarted",
      outcome: this.stores.simulation.getOutcomeData()
    });
    this.stores.simulation.restart();
    this.stores.ui.setNorthAtlanticView();
    log("SimulationRestarted");
  }

  public handleReload = () => {
    log("SimulationEnded", {
      reason: "SimulationReloaded",
      outcome: this.stores.simulation.getOutcomeData()
    });
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
