const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin  = require("copy-webpack-plugin");

module.exports = [{
  entry:   "./app.ts",
  output:  {
    path:     __dirname + "/dist",
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  module:  {
    rules: [
      {test: /\.tsx?$/, loader: "awesome-typescript-loader"},
      {enforce: "pre", test: /\.js$/, loader: "source-map-loader"}
    ]
  },
  mode: "development",
  target: "node",
  plugins: [
    new CleanWebpackPlugin("./dist/**/**", {}),
    new CopyWebpackPlugin([{from: "./env.json", to: "./env.json"}, {from: "./package.json", to: "./package.json"}], {})
  ]
}];