const HtmlWebpackPlugin = require("html-webpack-plugin");
const LessGlobPlugin    = require("less-plugin-glob");
const path              = require("path");

const entry = path.resolve(__dirname, "./public/main.tsx");
const out   = path.resolve(__dirname, "../../build/plugins/draft/public");

module.exports = {
  mode:    "development",
  entry:   entry,
  output:  {path: out, filename: "bundle.js", publicPath: "/"},
  watch:   true,
  module:  {
    rules: [
      {
        test: /\.less$/,
        use:  [
          {loader: "style-loader"},
          {loader: "css-loader"},
          {loader: "less-loader", options: {strictMath: true, noIeCompat: true, paths: [path.resolve(__dirname)], plugins: [require("less-plugin-glob")]}}
        ]
      },
      {test: /\.tsx?$/, loader: "awesome-typescript-loader", options: {configFileName: path.resolve(__dirname, "./tsconfig.json")}}
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title:    "Administration",
      filename: "index.html",
      template: path.resolve(__dirname, "./public/main.html")
    })
  ]
};