// Minimal mock for pixi.js v8. Pixi v8 dropped its canvas renderer fallback,
// so the real package can't initialize in jsdom (no WebGL). This mock provides
// just enough to let tests exercise PixiWindLayer's stage-children logic without
// touching a real renderer.

class Container {
  constructor() {
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.alpha = 1;
    this.rotation = 0;
    this.scale = { x: 1, y: 1 };
  }
  addChild(child) {
    this.children.push(child);
    return child;
  }
  removeChildren(begin = 0, end = this.children.length) {
    return this.children.splice(begin, end - begin);
  }
  destroy() {}
}

class Sprite extends Container {
  constructor(textureOrOptions) {
    super();
    if (textureOrOptions instanceof Texture) {
      this.texture = textureOrOptions;
    } else if (textureOrOptions && textureOrOptions.texture) {
      this.texture = textureOrOptions.texture;
    } else {
      this.texture = null;
    }
  }
}

class CanvasSource {
  constructor(options = {}) {
    this.resource = options.resource;
    this.scaleMode = options.scaleMode;
  }
}

class Texture {
  constructor(options = {}) {
    this.source = options.source;
    this.defaultAnchor = options.defaultAnchor;
  }
  static from(resource) {
    return new Texture({ source: new CanvasSource({ resource }) });
  }
}

class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

class Renderer {
  resize() {}
  render() {}
}

class Application {
  constructor() {
    this.stage = new Container();
    this.renderer = new Renderer();
  }
  init() {
    return Promise.resolve();
  }
  render() {}
  destroy() {}
}

module.exports = {
  Application,
  Container,
  Sprite,
  Texture,
  CanvasSource,
  Point,
};
