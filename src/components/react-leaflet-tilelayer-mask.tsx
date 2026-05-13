import { LatLngExpression, TileLayerOptions } from "leaflet";
import { createTileLayerComponent, updateGridLayer, withPane } from "@react-leaflet/core";
import LeafletTilelayerMask from "../libs/leaflet-tilelayer-mask";

interface IProps extends TileLayerOptions {
  url: string;
  maskSize?: number;
  maskCenter?: LatLngExpression;
  maskUrl?: string;
}

export const TilelayerMask = createTileLayerComponent<any, IProps>(
  ({ url, ...options }, context) => {
    // @ts-ignore - LeafletTilelayerMask is JS, no types.
    const instance = new LeafletTilelayerMask(url, withPane(options, context));
    return { instance, context };
  },
  updateGridLayer
);
