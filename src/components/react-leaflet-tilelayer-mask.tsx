import {LatLng, MapLayer, TileLayerProps, withLeaflet} from "react-leaflet";
import LeafletTilelayerMask from "../libs/leaflet-tilelayer-mask";

interface IProps extends TileLayerProps {
  maskSize?: number;
  maskCenter?: LatLng;
  maskUrl?: string;
}

export default withLeaflet(class TilelayerMask extends MapLayer<IProps> {
  public createLeafletElement(props: IProps): any {
    // @ts-ignore
    return new LeafletTilelayerMask(props.url, this.getOptions(props));
  }
});
