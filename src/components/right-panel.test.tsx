import * as React from "react";
import { mount } from "enzyme";
import { createStores } from "../models/stores";
import { Provider } from "mobx-react";
import * as css from "./right-panel.scss";
import { RightPanel } from "./right-panel";

describe("Right Panel component", () => {
  let stores = createStores();
  beforeEach(() => {
    stores = createStores();
  });

  it("renders basic components", () => {
    const wrapper = mount(
      <Provider stores={stores}>
        <RightPanel />
      </Provider>
    );
    const panel = wrapper.find('[data-test="right-panel"]');
    expect(panel.length).toEqual(1);
    // expect(panel.hasClass('open')).to.equal(true);
  });
});
