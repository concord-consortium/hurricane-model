// Taken from https://github.com/frogcat/leaflet-tilelayer-mask as it's an old library and it isn't published to NPM.
// Also, there are some customizations:
// - unavailable tiles are hidden, so browser doesn't display broken image icon

import * as L from "leaflet";
import { Browser } from 'leaflet'

var defaultMaskUrl = [
  "data:image/png;base64,",
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAC7lBMVEUAAAABAQECAgIDAwMEBAQF",
  "BQUGBgYHBwcICAgJCQkKCgoLCwsMDAwNDQ0ODg4PDw8QEBARERESEhITExMUFBQVFRUWFhYXFxcY",
  "GBgZGRkaGhobGxscHBwdHR0eHh4fHx8gICAhISEiIiIjIyMkJCQlJSUmJiYnJycoKCgpKSkqKior",
  "KyssLCwtLS0uLi4vLy8wMDAxMTEyMjIzMzM0NDQ1NTU2NjY3Nzc4ODg5OTk6Ojo7Ozs8PDw9PT0+",
  "Pj4/Pz9AQEBBQUFCQkJDQ0NERERGRkZHR0dISEhJSUlKSkpLS0tMTExNTU1OTk5PT09QUFBRUVFS",
  "UlJTU1NUVFRVVVVWVlZXV1dYWFhZWVlaWlpbW1tcXFxdXV1eXl5fX19gYGBhYWFiYmJjY2NkZGRl",
  "ZWVmZmZnZ2doaGhpaWlqampra2tsbGxtbW1ubm5vb29xcXFycnJzc3N0dHR1dXV2dnZ3d3d4eHh5",
  "eXl6enp7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiKioqLi4uMjIyN",
  "jY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+g",
  "oKChoaGioqKkpKSlpaWmpqanp6eoqKipqamqqqqrq6usrKytra2urq6vr6+wsLCxsbGysrKzs7O0",
  "tLS1tbW2tra3t7e4uLi5ubm6urq7u7u9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fI",
  "yMjJycnKysrLy8vMzMzNzc3Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2trb29vc",
  "3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v",
  "7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7///9A5nLSAAAA",
  "AWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98FHBEuKjDLarAAAAAdaVRY",
  "dENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAjNJREFUOMtjYEACjExMLCzMTIwM",
  "2AETK7eQhIyslAgvOzM2aU4xTbvAhMyspFAXPWkedCWM7GJGYVUz1+0+fGTfpvnNCdYynEwo8twq",
  "fo1rTt978fbDh3evHl7c1hOty49kCCOPTtK8U08+fPvx4+fPnz++fXpxaXWhhRAzQr9O5uob7779",
  "hIPvHx/sqLISgNnCrpK8+s6nHz+RwI8vT3aVGnJDPMwk5jfvBqo8SMWjDUkKrGAFnEYNJ9+hyQNV",
  "fLo+zUUAZASTeNjaJ99+YoDvr/flKLEAFbBpVp368BML+HJzohU3UAG33Yy7X7Ep+P58XZAwEwOT",
  "UOC65z+wKfj5/lCmLDMDk0T87rfYFXw6W6HGysAik3kYqxOAjrjcpM3GwCKbdQSXgivNOuwMTFLJ",
  "+95ht+Lz+Wp1VgYmkdBNL7Er+HA0V56FgZHXef7Db9jkf7zaEikGjC92vaYLn7Ap+HpvliMPMKyZ",
  "peO3vfiOxYB3x8s02ECRxWPdc+kjpiu+3FvoKwJOESwy0asefEGX//Zid74GOyTBcOoW7njyFdWM",
  "b6+Ot9rwQ3MIE79F9a5Hn74jJ5cXx3vcxeCJklnIqnTD9TdfoEp+fH13b3ebuxQrIlkzCxgmTdt3",
  "4/n7T1++fP7w6u6xhfk24qwo+YpbwSVn4rqDZy9fOX90y6wyXw1+tLzFyMqvZBWcUdHUXJ0b6agh",
  "zI6ZgxlZuIRlVbW11eXFeFhxZHAmZlY2dlYWlPwPAD6nKPWk11d/AAAAAElFTkSuQmCC"
].join("");

const remove = (el) => {
  var parent = el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
};

export default L.TileLayer.extend({
  options: {
    maskUrl: defaultMaskUrl,
    maskSize: 1000, // in kilometers
    maskCenter: [0, 0] // lat, lng
  },
  getMaskSize: function() {
    const size = this.options.maskSize;
    const center = L.latLng(this.options.maskCenter);

    const lngRadius = (size / 40075.017) * 360 / Math.cos((Math.PI / 180) * center.lat);
    const center2 = new L.LatLng(center.lat, center.lng - lngRadius);
    const point = this._map.latLngToContainerPoint(center);
    const point2 = this._map.latLngToContainerPoint(center2);

    const sizeInPx = Math.max(Math.round(point.x - point2.x), 1);

    return new L.Point(sizeInPx, sizeInPx);
  },
  _updateCenter: function() {
    if (this._map) {
      const containerPoint = this._map.latLngToContainerPoint(this.options.maskCenter);
      let p = this._map.containerPointToLayerPoint(containerPoint);
      p = p.subtract(this.getMaskSize().divideBy(2));
      this._image.setAttribute("x", p.x);
      this._image.setAttribute("y", p.y);
    }
  },
  _updateMaskSize: function() {
    if (this._map) {
      var size = this.getMaskSize();
      this._image.setAttribute("width", size.x);
      this._image.setAttribute("height", size.y);
    }
  },
  _handleViewChange: function() {
    this._updateCenter();
    this._updateMaskSize();
  },
  _initContainer: function() {
    if (this._container) return;
    var rootGroup = this._map.getRenderer(this)._rootGroup;
    var defs = rootGroup.appendChild(L.SVG.create("defs"));
    var container = rootGroup.appendChild(L.SVG.create("g"));
    var mask = defs.appendChild(L.SVG.create("mask"));
    var image = mask.appendChild(L.SVG.create("image"));
    var size = this.getMaskSize();
    mask.setAttribute("id", "leaflet-tilelayer-mask-" + L.stamp(this));
    mask.setAttribute("x", "-100%");
    mask.setAttribute("y", "-100%");
    mask.setAttribute("width", "200%");
    mask.setAttribute("height", "200%");
    image.setAttribute("width", size.x);
    image.setAttribute("height", size.y);
    image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", this.options.maskUrl);
    container.setAttribute("mask", "url(#" + mask.getAttribute("id") + ")");
    this._container = container;
    this._defs = defs;
    this._image = image;
    this._updateCenter();

    this._map.on("viewreset", this._handleViewChange, this);
    this._map.on("moveend", this._handleViewChange, this);
    if (this._map.options.zoomAnimation && Browser.any3d) {
      this._map.on("zoom", this._handleViewChange, this);
      this._map.on("zoomanim", this._handleViewChange, this);
    }
  },
  onRemove: function(map) {
    this._removeAllTiles();
    remove(this._container);
    remove(this._defs);
    map._removeZoomLimit(this);
    this._container = null;
    this._tileZoom = undefined;
  },
  _updateLevels: function() {
    var zoom = this._tileZoom;
    if (zoom === undefined) {
      return undefined;
    }

    for (var z in this._levels) {
      if (!this._levels[z].el.firstChild && z !== zoom) {
        L.DomUtil.remove(this._levels[z].el);
        this._removeTilesAtZoom(z);
        delete this._levels[z];
      }
    }

    var level = this._levels[zoom];
    if (!level) {
      var map = this._map;
      level = {
        el: this._container.appendChild(L.SVG.create("g")),
        origin: map.project(map.unproject(map.getPixelOrigin()), zoom).round(),
        zoom: zoom
      };
      this._setZoomTransform(level, map.getCenter(), map.getZoom());
      L.Util.falseFn(level.el.offsetWidth);
      this._levels[zoom] = level;
    }
    this._level = level;
    return level;
  },
  _addTile: function(coords, container) {
    var tilePos = this._getTilePos(coords);
    var tileSize = this.getTileSize();
    var key = this._tileCoordsToKey(coords);
    var url = this.getTileUrl(this._wrapCoords(coords));

    var tile = container.appendChild(L.SVG.create("image"));
    tile.setAttribute("width", tileSize.x);
    tile.setAttribute("height", tileSize.y);
    tile.setAttribute("x", tilePos.x);
    tile.setAttribute("y", tilePos.y);
    tile.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);

    // Hide unavailable tiles, so browser doesn't show broken image icon.
    tile.onerror = () => tile.style.display = "none";

    this._tiles[key] = {
      el: tile,
      coords: coords,
      current: true
    };
  }
});
