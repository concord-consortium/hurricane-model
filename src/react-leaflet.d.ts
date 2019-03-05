import "react-leaflet";

// react-leaflet types are incomplete. Add useful extensions.
declare module "react-leaflet" {
  interface MapProps {
    onViewportChanged?: () => void;
  }
}
