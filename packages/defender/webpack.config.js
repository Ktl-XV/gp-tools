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
  externals: [
    // List here all dependencies available on the Autotask environment
    /axios/,
    /apollo-client/,
    /defender-[^\-]+-client/,
    /ethers/,
    /web3/,
    /@ethersproject\/.*/,
    /aws-sdk/,
    /aws-sdk\/.*/,
  ],
  externalsType: "commonjs2",
  plugins: [
    // List here all dependencies that are not run in the Autotask environment
    new Dotenv({ path: "../../.env", safe: true }),
  ],
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    library: { type: "commonjs2" },
  },
};
