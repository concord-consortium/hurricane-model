import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import { BottomBar } from "./bottom-bar";
import { SeasonButton } from "./season-button";
import { PlaybackButtons } from "./playback-buttons";
import { WindArrowsToggle } from "./wind-arrows-toggle";

describe("BottomBar component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <BottomBar />
      </Provider>
    );
    expect(wrapper.find(PlaybackButtons).length).toEqual(1);
    expect(wrapper.find(SeasonButton).length).toEqual(1);
    expect(wrapper.find(WindArrowsToggle).length).toEqual(1);
  });
});
