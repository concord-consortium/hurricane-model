# Notes on Dependencies

This file documents issues with dependencies including reasons for not updating to newer versions of dependencies.

|Dependencies|Current|Latest|Notes|
|------------|-------|------|-----|
|**copy-webpack-plugin**|5.1.2|9.0.1|v6 broke cypress tests. v7 requires Webpack 5.|
|**css-loader**|5.2.7|6.4.0|v6 requires Webpack 5.|
|**d3-scale**|3.3.0|4.0.2|v4 requires [pure ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).|
|**file-loader**|4.3.0|6.2.0|v5 broke .png import in the app. Replacing `import * as Foo from "foo.png"` with `import Foo from "foo.png"` fixed the app but broke the jest tests.|
|**html-webpack-plugin**|4.5.2|5.4.0|v5 requires Webpack 5.|
|**min-css-extract-plugin**|0.12.0|2.4.2|Updating to v1 broke style imports.|
|**mobx**|5.15.7|6.3.5|Didn't attempt major version update.|
|**mobx-react**|5.4.4|7.2.1|Didn't attempt major version update.|
|**pixi.js**, **@types/pixi.js**|4.8.9|6.1.3|v5 appears to be a major update so I didn't attempt it.|
|**pngjs**, **@types/pngjs**|3.3.3|6.0.0|Was already pinned to 3.3.3, so I didn't attempt to update.|
|**postcss-loader**|4.3.0|6.2.0|v5 requires Webpack 5.|
|**react**, **react-dom**, **@types/react**, **@types/react-dom**|16.14.x|17.0.2|Lack of enzyme support; didn't attempt it.|
|**react-leaflet**|2.8.0|3.2.2|Didn't attempt major update.|
|**sass-loader**|10.2.0|12.2.0|v11 requires Webpack 5.|
|**screenfull**|4.2.1|5.1.0|Didn't attempt major update.|
|**style-loader**|1.3.0|3.3.0|Updating to v2 broke style imports.|
|**ts-loader**|8.3.0|9.2.6|v9 requires Webpack 5.|
|**tslint**|5.20.1|6.1.3|tslint is deprecated and should be replaced with eslint at some point.|
|**tslint-react**|4.2.0|5.0.0|tslint is deprecated and should be replaced with eslint at some point.|
|**url-loader**|2.3.0|4.1.1|Updating to v3 broke the precipitation overlay.|
|**webpack**|4.46.0|5.59.0|Didn't attempt the fairly major update to v5.|
|**webpack-cli**|3.3.12|4.9.1|v4 requires Webpack 5.|
|**webpack-dev-server**|3.11.2|4.3.1|v4 requires Webpack 5.|
