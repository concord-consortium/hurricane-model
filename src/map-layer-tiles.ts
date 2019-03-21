export interface MapTileLayer {
  mapType: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains: string[];
}

export type GeoMap = "satellite" | "street" | "relief";

const layerInfo: MapTileLayer[] = [
  {
    mapType: "satellite",
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    // tslint:disable-next-line:max-line-length
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 13,
    subdomains: []
  },
  {
    mapType: "street",
    name: "Street",
    url: "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}@2x.png",
    // tslint:disable-next-line:max-line-length
    attribution: 'Street map images are hosted by <a href="https://foundation.wikimedia.org/w/index.php?title=Maps_Terms_of_Use#Where_does_the_map_data_come_from.3F" target="_blank">The Wikimedia Foundation</a>, serving map data from <a href="https://openstreetmap.org" target="_blank">&#169;OpenStreetMap</a>',
    maxZoom: 19,
    subdomains: []
  },
  {
    mapType: "relief",
    name: "Relief",
    // tslint:disable-next-line:max-line-length
    url: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/ETOPO1_Global_Relief_Model_Color_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    // tslint:disable-next-line:max-line-length
    attribution: "NOAA National Centers for Environmental Information (NCEI), https://noaa.maps.arcgis.com/home/item.html?id=c7cdc62ec1d44297becf264bf67449f9",
    maxZoom: 7,
    subdomains: []
  },
  {
    mapType: "population",
    name: "Population",
    // tslint:disable-next-line:max-line-length
    url: "https://server.arcgisonline.com/arcgis/rest/services/Demographics/USA_Population_Density/MapServer/tile/{z}/{y}/{x}",
    // tslint:disable-next-line:max-line-length
    attribution: "NOAA National Centers for Environmental Information (NCEI), https://noaa.maps.arcgis.com/home/item.html?id=c7cdc62ec1d44297becf264bf67449f9",
    maxZoom: 7,
    subdomains: []
  }
];

export function mapLayer(layerType: GeoMap): MapTileLayer {
  return layerInfo.find(m => m.mapType === layerType) || layerInfo[0];
}
