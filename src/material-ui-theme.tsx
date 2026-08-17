import { createTheme } from "@mui/material/styles";
import { fontColor } from "./components/common";

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
          color: fontColor,
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
          "width": 24,
          "height": 24,
          "boxShadow": "0 1px 5px 0 rgba(0, 0, 0, 0.35)",
          "border": "1px solid #797979",
          // The 24px thumb grows downward from the switchBase's fixed top, landing ~3px below the
          // track's vertical center; nudge it up so the thumb is centered on the track (measured).
          "marginTop": "-2px",
          // Engaged look like the Storm Category slider thumb: fill with the orange (table × hover /
          // press colors) and keep the elevation shadow — NO white ring/outline.
          ".MuiSwitch-switchBase:hover &": {
            backgroundColor: "#ffdaa3", // $secondaryColorHover
            boxShadow: "0 1px 5px 0 rgba(0, 0, 0, 0.35)",
          },
          ".MuiSwitch-switchBase:active &": {
            backgroundColor: "#ff9900", // $secondaryColor
            boxShadow: "0 1px 5px 0 rgba(0, 0, 0, 0.35)",
          }
        },
        switchBase: {
          "backgroundColor": "transparent !important", // disable default hover state
          // Center the 24px thumb's travel so it rests ~6px from EACH edge of the switch (symmetric),
          // letting the flanking Hide/Show (Icon/Image) labels sit 6px from it on both sides.
          "marginLeft": "-3px",
          "&.Mui-checked": {
            transform: "translateX(22px)",
          },
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
