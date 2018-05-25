const _            = require("lodash");
const fs           = require("fs");
const ts           = require("gulp-typescript");
const gulp         = require("gulp");
const path         = require("path");
const merge        = require("merge-stream");
const buffer       = require("buffer");
const webpack      = require("webpack");
const gulp_webpack = require("webpack-stream");
const spawn        = require("child_process").spawn;


gulp.task("watch-server-typescript", cb => {
  const config_path = path.resolve(__dirname, "tsconfig.json");
  
  const tsc_path = path.resolve(__dirname, "node_modules/.bin/tsc.cmd");
  const args     = [`--listFiles`, `--project`, config_path, "--watch"];
  
  const tsc = spawn(tsc_path, args, {cwd: __dirname, stdio: ["ignore", "pipe", "ignore"]});
  tsc.stdout.on("data", (line) => {
    console.log("data", line.toString("utf8"));
  });
  tsc.on("close", () => {
    console.log("Watching finished");
  });
});


gulp.task("copy", () => gulp.src(["./env.json", "./package.json"]).pipe(gulp.dest("./build/")));

gulp.task("create-directories", () => gulp.src("*.*", {read: false}).pipe(gulp.dest("./build/plugins")));

gulp.task("ts-plugin-compile", () => {
  return gulp.src("./plugins/*/*.ts")
  .pipe(ts({
    module:                "commonjs",
    target:                "es6",
    newLine:               "LF",
    rootDir:               "./",
    outDir:                "./build",
    sourceMap:             false,
    noStrictGenericChecks: true
  }))
  .pipe(gulp.dest("./build/plugins/"));
});

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


gulp.task("build-server", gulp.series([gulp.parallel(["copy", "create-directories"]), "watch-server-typescript"]));
gulp.task("build-plugins", gulp.parallel(["ts-plugin-compile", "webpack-plugin-bundle"]));

gulp.task("default",
  gulp.series([
    gulp.parallel([
      "build-server",
      "build-plugins"
    ])
  ])
);

