'use strict';

const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const DEPLOY_PATH = process.env.DEPLOY_PATH;

module.exports = (env, argv) => {
  const devMode = argv.mode !== 'production';

  return {
    context: __dirname, // to automatically find tsconfig.json
    devtool: 'source-map',
    entry: './src/index.tsx',
    mode: 'development',
    output: {
      filename: 'assets/index.[contenthash].js',
      publicPath: ''
    },
    performance: { hints: false },
    module: {
      rules: [
        {
          // TODO(webpack-5-cleanup): Remove this rule when upgrading to webpack 5.
          // Pixi v6 ships .mjs ESM files imported by sibling .js CJS files; webpack 4
          // refuses that combination unless .mjs is treated as javascript/auto.
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto'
        },
        {
          test: /\.tsx?$/,
          enforce: 'pre',
          use: [
            {
              loader: 'tslint-loader',
              options: {}
            }
          ]
        },
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true // IMPORTANT! use transpileOnly mode to speed-up compilation
          }
        },
        {
          // TODO(webpack-5-cleanup): Remove this rule when upgrading to webpack 5.
          // Some node_modules ship modern ESM JS (optional chaining etc.) that webpack 4's
          // bundled acorn parser can't handle. Transpile them down with babel here.
          // A matching `transformIgnorePatterns` block in package.json's jest config does
          // the equivalent for tests and should be removed at the same time (webpack 5's
          // ecosystem and jest 30's ESM support both make this unnecessary).
          test: /\.js$/,
          include: /node_modules\/(screenfull|d3-scale|d3-array|d3-color|d3-format|d3-interpolate|d3-time|d3-time-format|internmap|@pixi|pixi\.js|pixi\.js-legacy)/,
          use: {
            loader: 'babel-loader',
            options: { presets: ['@babel/preset-env'] }
          }
        },
        {
          test: /\.(sa|sc)ss$/i,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]--[local]--__hurr-v1__'
                },
                sourceMap: true,
                importLoaders: 1
              }
            },
            'postcss-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.css$/i,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          // Webpack 5 asset modules replace url-loader. `type: 'asset'` inlines as
          // a data URI under the size threshold and emits a separate file above it.
          test: /\.(png|woff|woff2|eot|ttf)$/,
          type: 'asset',
          parser: { dataUrlCondition: { maxSize: 8192 } }
        },
        {
          test: /\.svg$/,
          oneOf: [
            {
              // Do not apply SVGR import in (S)CSS files.
              issuer: /\.scss$/,
              type: 'asset/resource'
            },
            {
              issuer: /\.tsx?$/,
              loader: '@svgr/webpack'
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      // pngjs (used to decode the SST images) imports several Node core modules.
      // Webpack 5 no longer auto-polyfills them; supply browser-friendly versions.
      fallback: {
        util: require.resolve('util/'),
        stream: require.resolve('stream-browserify'),
        zlib: require.resolve('browserify-zlib'),
        assert: require.resolve('assert/'),
        buffer: require.resolve('buffer/')
      }
    },
    ignoreWarnings: [
      // suppress "export not found" warnings about re-exported types
      /export .* was not found in/
    ],
    devServer: {
      hot: true,
      static: { directory: __dirname + '/dist' }
    },
    plugins: [
      // pngjs (and the util/buffer polyfills) reference `process` and `Buffer` as
      // globals. Webpack 5 doesn't auto-shim these the way webpack 4 did.
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      }),
      new MiniCssExtractPlugin({
        filename: devMode ? "assets/index.css" : "assets/index.[contenthash].css"
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/index.html'
      }),
      ...(DEPLOY_PATH ? [new HtmlWebpackPlugin({
        filename: 'index-top.html',
        template: 'src/index.html',
        favicon: 'src/public/favicon.ico',
        publicPath: DEPLOY_PATH,
      })] : []),
      new CopyWebpackPlugin([
        { from: 'src/public' }
      ])
    ]
  };
};
