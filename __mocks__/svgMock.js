// In production, @svgr/webpack converts SVG imports to React components
// (default export = component, named export `ReactComponent` = same component).
// Mirror that shape here so tests don't fail with "Element type is invalid".
const React = require("react");
const SvgMockComponent = (props) => React.createElement("svg", props);
module.exports = SvgMockComponent;
module.exports.default = SvgMockComponent;
module.exports.ReactComponent = SvgMockComponent;
