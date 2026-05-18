import { Provider } from "mobx-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { inIframe } from "@concord-consortium/lara-interactive-api";
import config from "./config";
import * as seedrandom from "./seedrandom";
import { AppComponent } from "./components/app";
import { LaraAppWrapper } from "./components/lara/lara-app-wrapper";
import { createStores } from "./models/stores";
import { ThemeProvider } from "@mui/material/styles";
import hurricanesTheme from "./material-ui-theme";
import { StoresContext } from "./stores-context";

// Setup seedrandom helper.
seedrandom.initialize(config.deterministic);

export const stores = createStores();

// Detect if running in an iframe (LARA/Activity Player context)
const isIframed = inIframe();

const container = document.getElementById("app");
if (container) {
  createRoot(container).render(
    <Provider stores={stores}>
      <StoresContext value={stores}>
        <ThemeProvider theme={hurricanesTheme}>
          {isIframed ? <LaraAppWrapper stores={stores} /> : <AppComponent />}
        </ThemeProvider>
      </StoresContext>
    </Provider>
  );
}

// A few helpers to make authoring and development easier.
// Make stores accessible through window object.
(window as any).stores = stores;
// Provide a function that serialize current pressure systems settings to an URL parameter that can be used later.
(window as any).serializePressureSystems = () => {
  const sim = stores.simulation;
  return "pressureSystems=" + encodeURIComponent(JSON.stringify(sim.pressureSystems.map(ps => ps.serialize())));
};
