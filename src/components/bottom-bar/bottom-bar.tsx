import Button from "@mui/material/Button";
import { clsx } from "clsx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import screenfull from "screenfull";

import config from "../../config";
import { log } from "../../log";
import { safeStartLocation } from "../../utils/interactive-state";
import { BaseComponent, IBaseProps } from "../base";
import { Dialog } from "../dialog";
import { HurricaneImageToggle } from "./hurricane-image-toggle";
import { HurricaneScale } from "./hurricane-scale";
import { IconButton } from "./icon-button";
import { SeasonButton } from "./season-button";
import { StartLocationButton } from "./start-location-button";
import { WindArrowsToggle } from "./wind-arrows-toggle";

import SetupIcon from "../../assets/bottom-bar/setup-icon.svg";
import CCLogo from "../../assets/cc-logo.svg";
import CCLogoSmall from "../../assets/cc-logo-small.svg";
import PauseIcon from "../../assets/pause.svg";
import StartIcon from "../../assets/start.svg";
import ReloadIcon from "../../assets/reload.svg";
import RestartIcon from "../../assets/restart.svg";
import ThermometerIcon from "../../assets/thermometer.svg";
import ThermometerHoverIcon from "../../assets/thermometer-hover.svg";

import css from "./bottom-bar.scss";

interface IProps extends IBaseProps {
  toggleLeftPanelOpen: () => void;
}
interface IState {
  fullscreen: boolean;
  isSeasonMenuOpen: boolean;
  isStartLocationMenuOpen: boolean;
  reloadConfirmOpen: boolean;
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
      isStartLocationMenuOpen: false,
      reloadConfirmOpen: false
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
    const { ready, simulationRunning, simulationStarted } = this.stores.simulation;
    const { isReadOnly, leftPanelOpen, overlay, thermometerActive } = this.stores.ui;
    const { isSeasonMenuOpen, isStartLocationMenuOpen } = this.state;
    const startLocationButtonHoveredClass = isStartLocationMenuOpen ? css.hovered : "";
    const seasonButtonHoveredClass = isSeasonMenuOpen ? css.hovered : "";
    const tempButtonDisabled = overlay !== "sst";
    const isStormMode = config.mode === "storm";
    const startLocationButtonDisabled = isReadOnly ||
      (config.lockSimulationWhileRunning && simulationStarted);
    const seasonButtonDisabled = isReadOnly ||
      (config.lockSimulationWhileRunning && simulationStarted);
    const simulationControlsDisabled = isReadOnly;
    const startLocationButtonClasses = clsx(
      css.widgetGroup,
      startLocationButtonHoveredClass,
      { hoverable: !startLocationButtonDisabled }
    );
    return (
      <div className={css.bottomBar}>
        <div className={css.leftContainer}>
          <CCLogo className={css.logo} />
          <CCLogoSmall className={css.logoSmall} />
        </div>
        <div className={css.mainContainer}>
          {
            isStormMode &&
            <div className={css.widgetGroup}>
              <Button
                onClick={this.toggleLeftPanel}
                className={clsx(css.bottomBarButton, css.stormSetupButton, { [css.open]: leftPanelOpen })}
                data-test="storm-setup-button"
                disableRipple={true}
              >
                <span><SetupIcon/>Storm Setup</span>
              </Button>
            </div>
          }
          {
            config.startLocationButton && !isStormMode &&
            <div className={startLocationButtonClasses}>
              <StartLocationButton
                onMenuOpen={() => this.setState({ isStartLocationMenuOpen: true })}
                onMenuClose={() => {
                  // delay to avoid flash between closing menu and :hover taking over
                  setTimeout(() => this.setState({ isStartLocationMenuOpen: false }), 500);
                }} />
            </div>
          }
          {
            config.seasonButton && !isStormMode &&
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
              active={thermometerActive}
              buttonText="Temp"
              dataTest="temp-button"
              icon={<ThermometerIcon />} highlightIcon={<ThermometerHoverIcon />}
              onClick={this.handleThermometerToggle}
            />
          </div>
          <div className={`${css.widgetGroup} ${css.reloadRestart}`}>
            <Button
              className={clsx(css.bottomBarButton, css.playbackButton)}
              data-test="reload-button"
              onClick={this.handleReload}
              disabled={simulationControlsDisabled}
              disableRipple={true}
            >
              <span><ReloadIcon/> Reload</span>
            </Button>
            <Button
              className={clsx(css.bottomBarButton, css.playbackButton)}
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
              disabled={simulationControlsDisabled || !ready}
              className={clsx(css.bottomBarButton, css.playbackButton)}
              data-test="start-button"
              disableRipple={true}
            >
              { simulationRunning ? <span><PauseIcon/> Stop</span> : <span><StartIcon /> Start</span> }
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
        <Dialog
          onClose={this.cancelReload}
          open={this.state.reloadConfirmOpen}
          title="Reload Model"
          ariaDescribedBy="reload-confirm-message"
        >
          <p id="reload-confirm-message">
            Are you sure you want to reload the model? You will lose all of your current settings.
          </p>
          <div className={css.confirmActions}>
            <Button
              data-test="reload-cancel-button"
              onClick={this.cancelReload}
              disableRipple={true}
              autoFocus={true}
            >
              Cancel
            </Button>
            <Button
              data-test="reload-confirm-button"
              onClick={this.confirmReload}
              disableRipple={true}
            >
              Reload
            </Button>
          </div>
        </Dialog>
      </div>
    );
  }

  public fullscreenChange = () => {
    this.setState({ fullscreen: screenfull && screenfull.isFullscreen });
  }

  public toggleLeftPanel = () => {
    this.props.toggleLeftPanelOpen();
  }

  public handleStartStop = () => {
    const { simulation } = this.stores;
    if (simulation.simulationRunning) {
      simulation.stop();
      log("SimulationStopped", {
        outcome: simulation.getOutcomeData()
      });
    } else {
      this.start();
    }
  }

  public start = () => {
    const { simulation: sim, ui } = this.stores;
    const { hurricane, startLocation } = sim;

    // Log before start() to capture the exact state the student sees before simulation begins,
    // consistent with SimulationEnded logging before restart/reset.
    log("SimulationStarted", {
      startLocation: safeStartLocation(startLocation),
      season: sim.season,
      windArrows: ui.windArrows,
      hurricaneImage: ui.hurricaneImage,
      baseMap: ui.baseMap,
      overlay: ui.overlay,
      accessibleSSTScale: ui.sstOverlay.accessibleSSTScale,
      thermometerActive: ui.thermometerActive,
      pressureSystems: sim.activePressureSystems.map(ps => ({
        type: ps.type,
        label: ps.label,
        center: { lat: ps.center.lat, lng: ps.center.lng },
        strength: ps.strength
      })),
      hurricane: {
        strength: hurricane.strength,
        center: { lat: hurricane.center.lat, lng: hurricane.center.lng }
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

  public restart = () => {
    this.stores.simulation.restart();
    this.stores.ui.setNorthAtlanticView();
  }

  public handleRestart = () => {
    log("SimulationEnded", {
      reason: "SimulationRestarted",
      outcome: this.stores.simulation.getOutcomeData()
    });
    this.restart();
    log("SimulationRestarted");
  }

  public handleReload = () => {
    this.setState({ reloadConfirmOpen: true });
  }

  public cancelReload = () => {
    this.setState({ reloadConfirmOpen: false });
  }

  public confirmReload = () => {
    log("SimulationEnded", {
      reason: "SimulationReloaded",
      outcome: this.stores.simulation.getOutcomeData()
    });
    this.stores.simulation.reset();
    this.stores.ui.reset();
    // Runs are reset last so the sole remaining run mirrors the freshly reset simulation.
    this.stores.runs.reset();
    log("SimulationReloaded");
    this.setState({ reloadConfirmOpen: false });
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
