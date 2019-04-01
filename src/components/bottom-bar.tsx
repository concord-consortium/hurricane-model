import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { SeasonButton } from "./season-button";
import { PlaybackButtons } from "./playback-buttons";
import { OpacitySlider } from "./opacity-slider";
import { HurricaneScale } from "./hurricane-scale";
import CCLogo from "../assets/cc-logo.svg";
import CCLogoSmall from "../assets/cc-logo-small.svg";
import config from "../config";
import screenfull from "screenfull";

import * as css from "./bottom-bar.scss";

interface IProps extends IBaseProps {}
interface IState {
  fullscreen: boolean;
}

function toggleFullscreen() {
  if (!screenfull) {
    return;
  }
  if (!screenfull.isFullscreen) {
    screenfull.request();
  } else {
    screenfull.exit();
  }
}

@inject("stores")
@observer
export class BottomBar extends BaseComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      fullscreen: false
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
    const anySlider = config.windArrowsSlider || config.seaSurfaceTempSlider;
    return (
      <div className={css.bottomBar}>
        <div className={css.leftContainer}>
          <CCLogo className={css.logo} />
          <CCLogoSmall className={css.logoSmall} />
        </div>
        <div className={css.mainContainer}>
          {
            config.seasonButton &&
            <div className={css.widgetGroup}>
              <SeasonButton />
            </div>
          }
          {
            anySlider &&
            <div className={`${css.widgetGroup} hoverable`}>
              {
                config.windArrowsSlider &&
                <OpacitySlider property="windArrows" showLabels={true} />
              }
              {
                config.seaSurfaceTempSlider &&
                <OpacitySlider property="seaSurfaceTemp" showLabels={!config.windArrowsSlider} />
              }
            </div>
          }
          <div className={`${css.widgetGroup} ${css.playbackContainer}`}>
            <PlaybackButtons />
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
}
