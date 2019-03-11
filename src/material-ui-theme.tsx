import { createMuiTheme } from "@material-ui/core/styles";

export default createMuiTheme({
  palette: {
    primary: {
      main: "#aaa"
    }
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
      text: {
        color: "#666",
        padding: 0,
      }
    },
    MuiSlider: {
      track: {
        "backgroundColor": "#797979",
        "height": 1,
        "&$vertical": {
          width: 1
        }
      },
      trackAfter: {
        opacity: 1
      },
      thumbIconWrapper: {
        width: "20px",
        height: "20px"
      }
    }
  }
});
