import Slider from "@mui/material/Slider";
import { observer } from "mobx-react";
import React from "react";

import { hurricaneCategoryInfo } from "../../constants";
import { useStores } from "../../stores-context";
import { SetupSection } from "./setup-section";

import HurricaneIcon from "../../assets/left-panel/hurricane.svg";

import categoryCss from "../hurricane-category.scss";
import css from "./storm-category-section.scss";

const hint = "Drag the slider to set the storm's starting strength. The storm icon updates in real time.";

const marks = hurricaneCategoryInfo.map((info, idx) => ({ value: idx, label: info.nameShort }));
const maxCategory = hurricaneCategoryInfo.length - 1;

export const StormCategorySection = observer(function StormCategorySection() {
  const stores = useStores();
  const { hurricane } = stores.simulation;
  const startingCategory = hurricane.startingCategory ?? 0;

  const handleChange = (_event: Event, value: number | number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    hurricane.setStartingCategory(numericValue);
  };

  return (
    <SetupSection
      dataTest="storm-category"
      hint={hint}
      Icon={HurricaneIcon}
      iconClassName={categoryCss["category" + startingCategory]}
      setupMode="stormCategory"
      title="Storm Category"
    >
      <div className={css.sliderContainer}>
        <Slider
          classes={{
            rail: css.rail,
            track: css.track,
            mark: css.mark,
            markLabel: css.markLabel,
            thumb: css.thumb
          }}
          min={0}
          max={maxCategory}
          step={1}
          track={false}
          marks={marks}
          value={startingCategory}
          onChange={handleChange}
          data-test="storm-category-slider"
        />
      </div>
      <div className={css.categoryName} data-test="storm-category-name">
        {hurricaneCategoryInfo[startingCategory].name}
      </div>
    </SetupSection>
  );
});
