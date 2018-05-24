const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin  = require("copy-webpack-plugin");
const HtmlWebpackPlugin  = require("html-webpack-plugin");
const path               = require("path");

module.exports = [{
  mode:    "development",
  entry:   "./plugins/docs/public/main.tsx",
  output:  {path: path.resolve(__dirname, "./build/plugins/docs/public/"), filename: "bundle.js"},
  module:  {
    rules: [
      {test: /\.less$/, use: [{loader: "style-loader"}, {loader: "css-loader"}, {loader: "less-loader", options: {strictMath: true, noIeCompat: true}}]},
      {test: /\.tsx?$/, loader: "awesome-typescript-loader"}
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title:    "ChatApp",
      filename: "index.html",
      template: "./plugins/docs/public/main.html"
    })
  ]
}];