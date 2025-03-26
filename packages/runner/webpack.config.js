const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

module.exports = {
  entry: {
    queue: "./src/queue.ts",
    execute: "./src/execute.ts",
  },
  target: "node",
  mode: "development",
  devtool: "cheap-module-source-map",
  module: {
    rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  externals: [],
  externalsType: "commonjs2",
  plugins: [],
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    library: { type: "commonjs2" },
  },
};
