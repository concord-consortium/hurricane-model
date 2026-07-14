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
      publicPath: 'auto'
    },
    performance: { hints: false },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true // IMPORTANT! use transpileOnly mode to speed-up compilation
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
                  localIdentName: '[name]--[local]--__hurr-v1__',
                  // Keep css-loader v5/v6 behavior: a single default export object
                  // (so `import css from "./X.scss"; css.foo` works). v7 flipped
                  // `namedExport` to true by default.
                  namedExport: false,
                  exportLocalsConvention: 'as-is'
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
      new CopyWebpackPlugin({
        patterns: [{ from: 'src/public' }]
      })
    ]
  };
};
