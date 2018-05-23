const _       = require("lodash");
const fs      = require("fs");
const path    = require("path");
const Promise = require("bluebird");

function clean(source, count = {directories: 0, files: 0}) {
  return new Promise((resolve, reject) => {
    fs.stat(source, (err, stats) => {
      if (err) { return reject(err); }
      if (stats.isDirectory()) {
        return fs.readdir(source, (err, files) => {
          if (err) {return reject(err);}
          count.directories++;
          Promise.all(_.map(files, (file) => clean(path.resolve(source, file), count)))
          .then(() => {
            fs.rmdir(source, err => err ? reject(err) : resolve(count))
          })
          .catch(err => reject(err));
        });
      }
      count.files++;
      fs.unlink(source, err => err ? reject(err) : resolve(count));
    });
  });
}

function copy(source, destination) {

}

clean(path.resolve(__dirname, "../build")).then(
  res => {
    if (res.directories > 0) { console.log(`Cleaned ${res.directories} directories.`); }
    if (res.files > 0) { console.log(`Cleaned ${res.files} files.`); }
    
  },
  err => console.error(err)
);

// new Promise((resolve, reject) => fs.rmdir(path.resolve(__dirname, "../build"), err => err ? reject(err) : resolve()))
// .then(res => {
//   console.log("Finished cleaning.");
//   Promise.all(_.map(["env.json", "package.json"], file => {
//     console.log(`Cleaning ${file}.`);
//     new Promise((resolve, reject) => fs.copyFile(path.resolve(__dirname, "../", file), path.resolve(__dirname, "../build", file), (err) => err ? reject(err) : resolve()));
//   }))
//   .then(res => console.log("Finished copying."))
//   .catch(err => console.error(err) || err);
// })
// .catch(err => console.error(err) || err);
