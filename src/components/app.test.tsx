import * as React from "react";
import { AppComponent } from "./app";
import { mount } from "enzyme";
import { UIModel } from "../models/ui";

describe("App component", () => {
  const stores = {
    ui: UIModel.create({})
  };
  it("renders without crashing", () => {
    mount(<AppComponent stores={stores} />);
  });
});
