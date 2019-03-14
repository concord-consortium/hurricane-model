import { createMuiTheme } from "@material-ui/core/styles";

export default createMuiTheme({
  palette: {
    primary: {
      main: "#aaa"
    }
  },
  shape: {
    borderRadius: 9
  },
  typography: {
    useNextVariants: true,
    fontFamily: "Lato, Arial, sans-serif",
    button: {
      textTransform: "none",
      fontSize: "14px",
      fontWeight: "bold"
    }
  },
  overrides: {
    MuiButton: {
      root: {
        "&:hover": {
          backgroundColor: "#f2f2f2",
        },
        "&$disabled": {
          color: "inherit",
          opacity: 0.5
        }
      },
      text: {
        color: "#666",
        padding: 0,
      }
    },
    // Ignore TS error in the next line. MuiSlider is part of material-ui/lab, not /core, so TS complains
    // about it being undefined. Perhaps it'd be possible to augment some interfaces, but it doesn't seem worth it.
    // @ts-ignore
    MuiSlider: {
      track: {
        "backgroundColor": "#797979",
        "height": 1,
        "&$vertical": {
          width: 1
        },
        "&$disabled": {
          color: "inherit",
          opacity: 0.25
        }
      },
      trackAfter: {
        opacity: 1
      },
      thumbIconWrapper: {
        "width": "20px",
        "height": "20px",

        "&$disabled": {
          width: "20px",
          height: "20px",
          opacity: 0.25
        }
      },
      thumb: {
        "&$focused, &:hover": {
          boxShadow: "0 0 0 3px rgba(255,255,255,0.85)"
        },
        "&$activated": {
          boxShadow: "0 0 0 3px rgba(255,255,255,0.85)"
        },
        "&$disabled": {
          boxShadow: 0
        }
      }
    }
  }
});
