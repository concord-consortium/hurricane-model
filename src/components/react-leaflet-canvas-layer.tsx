import {Map, Layer, Class, DomUtil, Browser, DomEvent, LatLng, ZoomAnimEvent, Point} from "leaflet";
import { createLayerComponent, LayerProps } from "@react-leaflet/core";

interface ILeafletCanvasLayer extends Layer {
  map: Map;
  canvas: HTMLCanvasElement;
  scheduleRedraw: () => void;
  draw: () => void;
  onMouseMove: (event: MouseEvent, pos: Point) => void;
  onMouseClick: (event: MouseEvent, pos: Point) => void;
  _props: IProps;
}

interface IProps extends LayerProps {
  drawMethod: (info: any) => void;
  onMouseMove?: (event: MouseEvent, pos: Point) => void;
  onMouseClick?: (event: MouseEvent, pos: Point) => void;
  data?: any;
}

export const CanvasLayer = createLayerComponent<ILeafletCanvasLayer, IProps>(
  (props, context) => {
    // @ts-ignore
    const instance: ILeafletCanvasLayer = new LeafletCanvasLayer();
    instance.draw = () => {
      const { canvas, map } = instance;
      instance._props.drawMethod?.({
        map,
        canvas,
        bounds: map.getBounds(),
        size: map.getSize(),
        zoom: map.getZoom(),
        center: map.getCenter(),
        corner: map.containerPointToLatLng(map.getSize()),
        data: instance._props.data
      });
    };
    instance.onMouseMove = (event: MouseEvent, pos: Point) => {
      instance._props.onMouseMove?.(event, pos);
    };
    instance.onMouseClick = (event: MouseEvent, pos: Point) => {
      instance._props.onMouseClick?.(event, pos);
    };
    instance._props = props;
    return { instance, context };
  },
  (instance, props, prevProps) => {
    instance._props = props;
    if (props.data !== prevProps.data) {
      instance.scheduleRedraw();
    }
  }
);

// Generic Leaflet CanvasLayer, based on:
// - https://github.com/Leaflet/Leaflet.heat
// - http://bl.ocks.org/sumbera/11114288
const LeafletCanvasLayer = (Layer || Class).extend({
  // Methods intended to be used or overwritten by client.
  draw() {
    // Should be overwritten by a subclass or in an instance.
  },

  onMouseMove(_event: any, _pos: Point) {
    // Can be overwritten by a subclass or in an instance.
  },

  onMouseClick(_event: any, _pos: Point) {
    // Can be overwritten by a subclass or in an instance.
  },

  scheduleRedraw() {
    if (this._map && !this._frame && !this._map._animating) {
      this._frame = window.requestAnimationFrame(this._redraw);
    }
    return this;
  },

  // Leaflet-specific methods.

  initCanvas() {
    const canvas: HTMLCanvasElement = DomUtil.create("canvas") as HTMLCanvasElement;
    this.canvas = canvas;
    const size = this._map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.width = size.x + "px";
    canvas.style.height = size.y + "px";

    const animated = this._map.options.zoomAnimation && Browser.any3d;
    DomUtil.addClass(canvas, "leaflet-canvas-layer leaflet-layer leaflet-zoom-" + (animated ? "animated" : "hide"));
  },

  onAdd(map: Map) {
    // To satisfy Layer interface (and perhaps some Leaflet internals).
    this._map = map;
    // To satisfy ILeafletCanvasLayer interface.
    this.map = map;
    if (!this.canvas) {
      this.initCanvas();
    }
    map.getPanes().overlayPane.appendChild(this.canvas);

    map.on("viewreset", this._reset, this);
    map.on("moveend", this._reset, this);
    if (map.options.zoomAnimation && Browser.any3d) {
      map.on("zoom", this._onZoom, this);
      map.on("zoomanim", this._onAnimateZoom, this);
    }
    this._reset();
    this._initEventHandlers();
  },

  onRemove(map: Map) {
    map.getPanes().overlayPane.removeChild(this.canvas);
    map.off("viewreset", this._reset, this);
    map.off("moveend", this._reset, this);
    if (map.options.zoomAnimation) {
      map.off("zoom", this._onZoom, this);
      map.off("zoomanim", this._onAnimateZoom, this);
    }
    this._removeEventHandlers();
  },

  addTo(map: Map) {
    map.addLayer(this);
    return this;
  },

  // Priv methods.

  _reset() {
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    DomUtil.setPosition(this.canvas, topLeft);

    const size = this._map.getSize();
    if (this.canvas.style.width !== size.x + "px") {
      this.canvas.width = size.x;
      this.canvas.style.width = size.x + "px";
    }
    if (this.canvas.style.height !== size.y + "px") {
      this.canvas.height = size.y;
      this.canvas.style.height = size.y + "px";
    }

    this._redraw();
    this._center = this.map.getCenter();
    this._zoom = this.map.getZoom();
  },

  _redraw() {
    this._frame = null;
    this.draw();
  },

  _onZoom() {
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
  },

  _onAnimateZoom(e: ZoomAnimEvent) {
    this._updateTransform(e.center, e.zoom);
  },

  _updateTransform(center: LatLng, zoom: number) {
    const scale = this._map.getZoomScale(zoom, this._zoom);
    const position = DomUtil.getPosition(this.canvas);
    const viewHalf = this._map.getSize().multiplyBy(0.5);
    const currentCenterPoint = this._map.project(this._center, zoom);
    const destCenterPoint = this._map.project(center, zoom);
    const centerOffset = destCenterPoint.subtract(currentCenterPoint);
    const topLeftOffset = viewHalf.multiplyBy(-scale).add(position).add(viewHalf).subtract(centerOffset);

    DomUtil.setTransform(this.canvas, topLeftOffset, scale);
  },

  _initEventHandlers() {
    DomEvent.on(this.canvas, "mousedown", this._onMouseDown, this);
    DomEvent.on(this.canvas, "touchstart", this._onMouseDown, this);
    DomEvent.on(this.canvas, "mousemove", this._onMouseMove, this);
    DomEvent.on(this.canvas, "touchmove", this._onMouseMove, this);
    DomEvent.on(this.canvas, "mouseup", this._onMouseClick, this);
    DomEvent.on(this.canvas, "touchend", this._onMouseClick, this);
  },

  _removeEventHandlers() {
    DomEvent.off(this.canvas, "mousedown", this._onMouseDown);
    DomEvent.off(this.canvas, "touchstart", this._onMouseDown);
    DomEvent.off(this.canvas, "mousemove", this._onMouseMove);
    DomEvent.off(this.canvas, "touchmove", this._onMouseMove);
    DomEvent.off(this.canvas, "mouseup", this._onMouseClick);
    DomEvent.off(this.canvas, "touchend", this._onMouseClick);
  },

  _onMouseDown() {
    this._wasMoving = false;
  },

  _onMouseMove(e: any) {
    this._wasMoving = true;
    const event = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const pos = DomEvent.getMousePosition(event, this.canvas);
    this.onMouseMove(e, pos);
  },

  _onMouseClick(e: any) {
    if (this._wasMoving) {
      // Do not trigger click if pointer was moving around.
      return;
    }
    const event = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const pos = DomEvent.getMousePosition(event, this.canvas);
    this.onMouseClick(e, pos);
  }
}) as any as ILeafletCanvasLayer;
