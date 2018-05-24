const _       = require("lodash");
const path    = require("path");
const Promise = require("bluebird");
const fs      = require("fs");

function clean(source) {
  const count = {directories: 0, files: 0};
  return new Promise((resolve, reject) => {
    fs.stat(source, (err, stats) => {
      err ? err.code === "ENOENT" ? resolve(count) : reject(err) : clean[stats.isDirectory() ? "directory" : "file"](source, count)
      .then(() => resolve(count))
      .catch(err => reject(err));
    });
  });
}
clean.directory = (source, count) => new Promise((resolve, reject) =>
  fs.readdir(source, (err, files) =>
    err ? reject(err) : Promise.map(files, file => new Promise((resolve, reject) =>
      fs.stat(path.resolve(source, file), (err, stats) =>
        err ? reject(err) : clean[stats.isDirectory() ? "directory" : "file"](path.resolve(source, file), count)
        .then(() => resolve(stats.isDirectory() ? count.directories++ : count.files++))
        .catch(err => reject(err))
      )
    ))
    .then(() => fs.rmdir(source, err => err ? reject(err) : resolve()))
    .catch(err => reject(err))
  )
);
clean.file      = (source, count) => new Promise((resolve, reject) =>
  fs.unlink(source, err => err ? reject(err) : resolve())
);

function ensurePath(target) {
  const link   = path.parse(target);
  const dir    = link.ext ? link.dir : target;
  const subdir = path.parse(target).dir;
  return new Promise((resolve, reject) =>
    fs.access(target, err =>
      !err ? resolve(target) : err.code !== "ENOENT" ? reject(err) : new Promise((resolve, reject) =>
        fs.mkdir(dir, err =>
          !err || _.get(err, "code", "EEXIST") === "EEXIST" ? resolve() : err.code !== "ENOENT" ? reject(err) : (ensurePath.cache[subdir] || (ensurePath.cache[subdir] = ensurePath(subdir)))
          .then(res => resolve())
          .catch(err => reject(err))
        )
      )
      .then(() => link.ext ? resolve() : fs.mkdir(target, err => _.get(err, "code", "EEXIST") !== "EEXIST" ? reject(err) : resolve(target)))
      .catch(err => reject(err))
    )
  );
}
ensurePath.cache = {};

function copy(source, destination) {
  const count = {directories: 0, files: 0};
  return new Promise((resolve, reject) =>
    fs.stat(source, (err, stats) =>
      err ? reject(err) : ensurePath(destination)
      .then(() =>
        copy[stats.isDirectory() ? "directory" : "file"](source, destination, count)
        .then(() => resolve(count))
        .catch(err => reject(err))
      )
      .catch(err => reject(err))
    )
  );
}
copy.directory = (source, destination, count) => new Promise((resolve, reject) =>
  fs.readdir(source, (err, files) =>
    err ? reject(err) : ensurePath(destination)
    .then(() =>
      Promise.map(files, file => new Promise((resolve, reject) =>
        fs.stat(path.resolve(source, file), (err, stats) =>
          err ? reject(err) : copy[stats.isDirectory() ? "directory" : "file"](path.resolve(source, file), path.resolve(destination, file), count)
          .then(() => resolve())
          .catch(err => reject(err))
        )
      ))
      .then(res => resolve(count.directories++))
      .catch(err => reject(err))
    )
    .catch(err => reject(err))
  )
);
copy.file      = (source, destination, count) => new Promise((resolve, reject) =>
  fs.createReadStream(source)
  .on("error", err => reject(err))
  .pipe(
    fs.createWriteStream(destination)
    .on("error", err => reject(err))
    .on("close", () => resolve(count.files++))
  )
);

clean(path.resolve(__dirname, "../build")).then(
  res => {
    console.log(`Cleaned ${res.directories} directories and ${res.files} files.`);
    Promise.map(["env.json", "package.json"], file => copy(path.resolve(__dirname, "../", file), path.resolve(__dirname, "../build", file)))
    .each(res => console.log(`Copied ${res.directories} directories and ${res.files} files.`))
    .catch(err => console.error(err));
  },
  err => console.error(err)
);
