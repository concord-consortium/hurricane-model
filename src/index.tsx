import { Provider } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import config from "./config"
import * as seedrandom from "./seedrandom";
import { AppComponent } from "./components/app";
import { createStores } from "./models/stores";

// Setup seedrandom helper.
seedrandom.initialize(config.deterministic);

export const stores = createStores();

ReactDOM.render(
  <Provider stores={stores}>
    <AppComponent />
  </Provider>,
  document.getElementById("app")
);
