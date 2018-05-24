const gulp      = require("gulp");
const ts        = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const clean     = require("gulp-clean");

gulp.task("clean-all", () => gulp.src("./build", {read: false}).pipe(clean()));

gulp.task("clean-server", () => gulp.src(["build/*", "!build/plugins"], {read: false}).pipe(clean()));

gulp.task("ts", () => tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("build")));

