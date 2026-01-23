import { Provider } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { inIframe } from "@concord-consortium/lara-interactive-api";
import config from "./config";
import * as seedrandom from "./seedrandom";
import { AppComponent } from "./components/app";
import { LaraAppWrapper } from "./components/lara-app-wrapper";
import { createStores } from "./models/stores";
import { MuiThemeProvider } from "@material-ui/core/styles";
import hurricanesTheme from "./material-ui-theme";

// Setup seedrandom helper.
seedrandom.initialize(config.deterministic);

export const stores = createStores();

// Detect if running in an iframe (LARA/Activity Player context)
const isIframed = inIframe();

ReactDOM.render(
  <Provider stores={stores}>
    <MuiThemeProvider theme={hurricanesTheme}>
      {isIframed ? <LaraAppWrapper stores={stores} /> : <AppComponent />}
    </MuiThemeProvider>
  </Provider>,
  document.getElementById("app")
);

// A few helpers to make authoring and development easier.
// Make stores accessible through window object.
(window as any).stores = stores;
// Provide a function that serialize current pressure systems settings to an URL parameter that can be used later.
(window as any).serializePressureSystems = () => {
  const sim = stores.simulation;
  return "pressureSystems=" + encodeURIComponent(JSON.stringify(sim.pressureSystems.map(ps => ps.serialize())));
};
