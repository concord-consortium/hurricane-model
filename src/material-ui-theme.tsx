import { createTheme } from "@mui/material/styles";

export default createTheme({
  palette: {
    primary: {
      main: "#aaa"
    },
    secondary: {
      main: "#ff9900"
    }
  },
  shape: {
    borderRadius: 9
  },
  typography: {
    fontFamily: "Lato, Arial, sans-serif",
    button: {
      textTransform: "none",
      fontSize: "14px",
      fontWeight: "bold"
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          "minWidth": "60px",
          "&:hover": {
            backgroundColor: "#dfdfdf",
          },
          "&.Mui-disabled": {
            color: "inherit",
            opacity: 0.25
          }
        },
        text: {
          color: "#434343",
          padding: 0,
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "11px",
          padding: "6px",
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 14
        },
        thumb: {
          "width": 18,
          "height": 18,
          "boxShadow": "0 1px 5px 0 rgba(0, 0, 0, 0.35)",
          "border": "1px solid #797979",
          ".MuiSwitch-switchBase:hover &": {
            boxShadow: "0 0 0 3px rgba(255, 255, 255, 0.5)",
          },
          ".MuiSwitch-switchBase:active &": {
            boxShadow: "0 0 0 3px rgba(255, 255, 255, 1)",
          }
        },
        switchBase: {
          backgroundColor: "transparent !important" // disable default hover state
        },
        track: {
          "backgroundColor": "#797979",
          "opacity": 1,
          ".MuiSwitch-switchBase.Mui-checked + &": {
            opacity: 1
          }
        }
      }
    }
  }
});
