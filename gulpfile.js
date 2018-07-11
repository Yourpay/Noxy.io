const _            = require("lodash");
const fs           = require("fs");
const gulp         = require("gulp");
const path         = require("path");
const merge        = require("merge-stream");
const webpack      = require("webpack");
const gulp_webpack = require("webpack-stream");
const spawn        = require("child_process").spawn;
const tsc          = path.resolve(__dirname, "node_modules/.bin/tsc.cmd");

gulp.task("watch-server-typescript", cb =>
  spawn(tsc, ["--project", path.resolve(__dirname, "tsconfig.json")], {cwd: __dirname, stdio: ["ignore", "pipe", "ignore"]})
  .stdout.on("data", line => console.log("[TS-SERVER]", line.toString("utf8")))
  .on("close", () => console.log("[TS-SERVER]", "Finished watching") || cb())
);

gulp.task("watch-plugin-typescript", cb => {
  spawn(tsc, ["--project", path.resolve(__dirname, "plugin-tsconfig.json")], {cwd: __dirname, stdio: ["ignore", "pipe", "ignore"]})
  .stdout.on("data", line => console.log("[TS-PLUGIN]", line.toString("utf8")))
  .on("close", () => console.log("[TS-PLUGIN]", "Finished watching") || cb());
});

gulp.task("copy", () => gulp.src(["./env.json", "./package.json", "./favicon.ico"]).pipe(gulp.dest("./build/")));

gulp.task("create-directories", () => gulp.src("*.*", {read: false}).pipe(gulp.dest("./build/plugins")));

gulp.task("webpack-plugin-bundle", () => {
  const scripts = [];
  const plugins = path.resolve(__dirname, "./plugins");
  
  _.each(fs.readdirSync(plugins), file => {
    const directory = path.resolve(plugins, file);
    const stats     = fs.statSync(directory);
    if (stats.isDirectory()) {
      const webpack_path = path.resolve(directory, "webpack.config.js");
      try {
        if (!fs.accessSync(webpack_path, fs.constants.R_OK)) {
          const config = require(webpack_path);
          scripts.push(gulp.src(path.resolve(directory, config.entry)).pipe(gulp_webpack(config, webpack)).pipe(gulp.dest(config.output.path)));
        }
      }
      catch (e) {
        console.log(`No webpack config found for "${file}"`);
      }
    }
  });
  
  return merge.apply(null, scripts);
});


gulp.task("build-server", gulp.parallel([
  "watch-server-typescript"
]));

gulp.task("build-plugins", gulp.parallel([
  "watch-plugin-typescript",
  "webpack-plugin-bundle"
]));

gulp.task("default",
  gulp.series([
    gulp.parallel([
      "copy",
      "create-directories"
    ]),
    gulp.parallel([
      "build-server",
      "build-plugins"
    ])
  ])
);

