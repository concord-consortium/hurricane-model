import Button from "@mui/material/Button";
import { clsx } from "clsx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { createPortal } from "react-dom";
import screenfull from "screenfull";

import config from "../../config";
import { log } from "../../log";
import { setupChangedFromDefault } from "../../models/interactive-state";
import { safeStartLocation } from "../../utils/interactive-state";
import { BaseComponent, IBaseProps } from "../base";
import { Dialog } from "../dialog";
import { HurricaneScale } from "./hurricane-scale";
import { IconButton } from "./icon-button";
import { SeasonButton } from "./season-button";
import { StartLocationButton } from "./start-location-button";

import CCLogo from "../../assets/cc-logo.svg";
import CCLogoSmall from "../../assets/cc-logo-small.svg";
import PauseIcon from "../../assets/pause.svg";
import StartIcon from "../../assets/start.svg";
import ReloadIcon from "../../assets/reload.svg";
import RestartIcon from "../../assets/restart.svg";
import ThermometerIcon from "../../assets/thermometer.svg";
import ThermometerHoverIcon from "../../assets/thermometer-hover.svg";

import css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {
  fullscreen: boolean;
  isSeasonMenuOpen: boolean;
  isStartLocationMenuOpen: boolean;
  reloadConfirmOpen: boolean;
  pillBoxes: { left: number; top: number; width: number; height: number }[];
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

  // Refs on each converted bubble so its behind-the-bar outline pill can be measured + positioned
  // (the bar uses space-between, so each bubble's x depends on window width — measure, don't hardcode).
  private barRef = React.createRef<HTMLDivElement>();
  private reloadRef = React.createRef<HTMLDivElement>();
  private startRef = React.createRef<HTMLDivElement>();
  private tempRef = React.createRef<HTMLDivElement>();
  private hurricaneRef = React.createRef<HTMLDivElement>();

  constructor(props: IProps) {
    super(props);
    this.state = {
      fullscreen: false,
      isSeasonMenuOpen: false,
      isStartLocationMenuOpen: false,
      reloadConfirmOpen: false,
      pillBoxes: []
    };
  }

  // Recompute the portaled behind-the-bar outline pills on mount + resize (the bar uses space-between,
  // so button x depends on window width — measure, don't hardcode). One pill per converted bubble,
  // sized to the bubble's BORDER box so its 1px inset stroke sits exactly where the old border was —
  // concentric with the white fill (gray outer 9px / inner 8px).
  public measureLayout = () => {
    const bar = this.barRef.current;
    const index = bar?.parentElement;
    if (!bar || !index) return;
    const ir = index.getBoundingClientRect();

    // Clamp each pill's bottom to the bar's bottom (the viewport edge). The bubble border-box spills
    // ~1px below the viewport; since the pill is absolutely positioned directly in .index, that spill
    // would add a 1px document scrollbar. The clamped-off part sits behind the bar anyway, so nothing
    // visible changes.
    const barBottom = bar.getBoundingClientRect().bottom - ir.top;
    const pillBoxes = [this.reloadRef, this.startRef, this.tempRef, this.hurricaneRef]
      .map(ref => ref.current)
      .filter((el): el is HTMLDivElement => !!el)
      .map(el => {
        const r = el.getBoundingClientRect();
        const top = r.top - ir.top;
        return { left: r.left - ir.left, top, width: r.width, height: Math.min(r.height, barBottom - top) };
      });

    this.setState({ pillBoxes });
  }

  get fullscreenIconStyle() {
    return css.fullscreenIcon + (this.state.fullscreen ? ` ${css.fullscreen}` : "");
  }

  public componentDidMount() {
    if (screenfull && screenfull.isEnabled) {
      document.addEventListener(screenfull.raw.fullscreenchange, this.fullscreenChange);
    }
    requestAnimationFrame(this.measureLayout);
    window.addEventListener("resize", this.measureLayout);
  }

  public componentWillUnmount() {
    if (screenfull && screenfull.isEnabled) {
      document.removeEventListener(screenfull.raw.fullscreenchange, this.fullscreenChange);
    }
    window.removeEventListener("resize", this.measureLayout);
  }

  public render() {
    const { ready, simulationRunning, simulationStarted } = this.stores.simulation;
    const { isReportMode, overlay, thermometerActive } = this.stores.ui;
    const { isSeasonMenuOpen, isStartLocationMenuOpen } = this.state;
    const startLocationButtonHoveredClass = isStartLocationMenuOpen ? css.hovered : "";
    const seasonButtonHoveredClass = isSeasonMenuOpen ? css.hovered : "";
    const tempButtonDisabled = overlay !== "sst";
    const isStormMode = config.mode === "storm";
    const startLocationButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && simulationStarted);
    const seasonButtonDisabled = isReportMode ||
      (config.lockSimulationWhileRunning && simulationStarted);
    const simulationControlsDisabled = isReportMode;
    // A finished run is selected (view-only): there's nothing to Start until the learner edits it or
    // starts a new run.
    const { setupLocked } = this.stores.multiTrack;
    // Restart/Edit only makes sense once a run has actually been run (or a completed run is being
    // viewed, to unlock it) — so it's disabled on first load and on every new (not-yet-run) card.
    // It also stays disabled *while the run is playing* — it only becomes available once the run
    // finishes or the learner hits Stop (simulationRunning goes false).
    const restartDisabled = simulationControlsDisabled || simulationRunning ||
      (!simulationStarted && !setupLocked);
    // Clear All only makes sense once there's something to clear — the learner has changed the setup
    // from default, a run is completed, or a run was started. So on a pristine first card it's inert,
    // and (like Restart/Edit) it stays disabled *while a run is playing* — only re-enabling once the
    // run finishes or the learner hits Stop.
    const hasCompletedRuns = this.stores.multiTrack.runs.some(r => r.state !== null);
    const clearAllDisabled = simulationControlsDisabled || simulationRunning ||
      (!simulationStarted && !hasCompletedRuns && !setupChangedFromDefault(this.stores));
    const startLocationButtonClasses = clsx(
      css.widgetGroup,
      startLocationButtonHoveredClass,
      { hoverable: !startLocationButtonDisabled }
    );
    return (
      <div className={css.bottomBar} ref={this.barRef}>
        <div className={css.leftContainer}>
          <CCLogo className={css.logo} />
          <CCLogoSmall className={css.logoSmall} />
        </div>
        <div className={css.mainContainer}>
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
          <div className={`${css.widgetGroup} ${css.reloadRestart} ${css.pillGroup}`} ref={this.reloadRef}>
            <Button
              className={clsx(css.bottomBarButton, css.playbackButton, css.w66)}
              data-test="reload-button"
              onClick={this.handleReload}
              disabled={clearAllDisabled}
              disableRipple={true}
            >
              <span><ReloadIcon/><span className={css.btnLabel}>Clear All</span></span>
            </Button>
            <Button
              className={clsx(css.bottomBarButton, css.playbackButton, css.restartEdit)}
              data-test="restart-button"
              onClick={this.handleRestart}
              disabled={restartDisabled}
              disableRipple={true}
            >
              <span><RestartIcon/><span className={css.btnLabel}>Restart/Edit</span></span>
            </Button>
          </div>
          <div className={`${css.widgetGroup} ${css.stopStart} ${css.pillGroup}`} ref={this.startRef}>
            <Button
              onClick={this.handleStartStop}
              disabled={simulationControlsDisabled || !ready || setupLocked}
              className={clsx(css.bottomBarButton, css.playbackButton, css.w66)}
              data-test="start-button"
              disableRipple={true}
            >
              { simulationRunning
                ? <span><PauseIcon/><span className={css.btnLabel}>Stop</span></span>
                : <span><StartIcon /><span className={css.btnLabel}>Start</span></span> }
            </Button>
          </div>
          <div
            className={`${css.widgetGroup} ${css.pillGroup} ${css.w66} ` +
              `${thermometerActive ? css.pillSelected : ""} ${tempButtonDisabled ? "" : "hoverable"}`}
            ref={this.tempRef}
          >
            <IconButton
              disabled={tempButtonDisabled}
              active={thermometerActive}
              buttonText="Temp"
              dataTest="temp-button"
              icon={<ThermometerIcon />} highlightIcon={<ThermometerHoverIcon />}
              onClick={this.handleThermometerToggle}
            />
          </div>
          <div className={`${css.widgetGroup} ${css.pillGroup}`} ref={this.hurricaneRef}>
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
          title="Clear All"
          ariaDescribedBy="reload-confirm-message"
        >
          <p id="reload-confirm-message" className={css.confirmMessage}>
            Are you sure you want to clear everything?<br />
            You will lose all of your current settings and saved runs.
          </p>
          <div className={css.confirmActions}>
            <button
              type="button"
              data-test="reload-cancel-button"
              className={css.confirmButton}
              onClick={this.cancelReload}
              autoFocus={true}
            >
              Cancel
            </button>
            <button
              type="button"
              data-test="reload-confirm-button"
              className={css.confirmButton}
              onClick={this.confirmReload}
            >
              Clear All
            </button>
          </div>
        </Dialog>
        {
          // Behind-the-bar outline pills (layered-pill treatment), one per converted bubble. Portaled
          // into .index so they sit BEHIND the bar; only each rounded top peeks above, providing the
          // gray outline.
          this.state.pillBoxes.length > 0 && this.barRef.current?.parentElement &&
          createPortal(
            <>
              {this.state.pillBoxes.map((box, i) => (
                <div
                  key={i}
                  className={css.pillBelow}
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                />
              ))}
            </>,
            this.barRef.current.parentElement
          )
        }
      </div>
    );
  }

  public fullscreenChange = () => {
    this.setState({ fullscreen: screenfull && screenfull.isFullscreen });
  }

  public handleStartStop = () => {
    const { simulation, ui } = this.stores;
    if (simulation.simulationRunning) {
      simulation.stop();
      log("SimulationStopped", {
        outcome: simulation.getOutcomeData()
      });
    } else {
      // Collapse any open setup category when the run starts; the panel itself is left as the user
      // set it (open or closed) — it no longer auto-closes on run.
      ui.setSetupMode(undefined);
      this.start();
    }
  }

  public start = () => {
    const { simulation: sim, ui } = this.stores;
    const { hurricane, startLocation } = sim;

    // Each Start is a NEW run: clear the previous run's track (keeping the current setup) so the
    // storm re-launches from the configured start instead of appending onto the last track. The
    // selected editable card stays selected so the run is auto-captured into it when it finishes.
    if (sim.simulationStarted) {
      sim.restart(false);
    }

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
      pressureSystems: sim.pressureSystems.map(ps => ({
        type: ps.type,
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
    const { simulation, ui, multiTrack } = this.stores;
    simulation.restart();
    ui.setNorthAtlanticView();
    // Restart returns the storm to its start position — make sure it's visible (and re-runnable) by
    // unlocking a locked/completed run, instead of staying hidden behind the completed-run view.
    const sel = multiTrack.selectedRun;
    if (sel && sel.state) multiTrack.editRun(sel.id);
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
    // simulation.reset() doesn't restore hurricane.startingCategory — reset it to the captured default.
    const defCat = this.stores.multiTrack.defaultState?.simulation.hurricane.startingCategory;
    if (defCat != null) this.stores.simulation.hurricane.setStartingCategory(defCat);
    // Reload is a clean slate: wipe all runs and selection, then start fresh with one empty run.
    // (The Compare strip auto-hides once there are no completed runs.)
    this.stores.multiTrack.resetAll();
    this.stores.multiTrack.addRun();
    this.stores.ui.setSetupMode(undefined);
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
