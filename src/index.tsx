import { Provider } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import config from "./config";
import * as seedrandom from "./seedrandom";
import { AppComponent } from "./components/app";
import { createStores } from "./models/stores";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";

// Setup seedrandom helper.
seedrandom.initialize(config.deterministic);

export const stores = createStores();

const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
    fontFamily: "Lato, Arial, sans-serif",
    button: {
      textTransform: "none"
    }
  },
});

ReactDOM.render(
  <Provider stores={stores}>
    <MuiThemeProvider theme={theme}>
      <AppComponent />
    </MuiThemeProvider>
  </Provider>,
  document.getElementById("app")
);
