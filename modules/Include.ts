import * as fs from "fs";
import * as path from "path";
import * as Promise from "bluebird";
import * as _ from "lodash";
import * as flat from "flat";

export function Include(dir_path: string): Promise<{[key: string]: any}>
export function Include(options: iIncludeOptions & {sync: true}): {[key: string]: any}
export function Include(options: iIncludeOptions): Promise<{[key: string]: any}>
export function Include(path_or_options: string | iIncludeOptions): Promise<{[key: string]: string}> | {[key: string]: any} {
  if (typeof path_or_options === "string") { return Include.async({path: path_or_options}); }
  return path_or_options.sync ? Include.sync(path_or_options) : Include.async(path_or_options);
}

export namespace Include {
  export function async(options: iIncludeOptions): Promise<{[key: string]: any}> {
    return new Promise<{[key: string]: any}>((resolve, reject) => {
      const offset = options.path.length;
      const parsed_path = path.parse(options.path);
      walkDirAsync(path.resolve(options.path))
      .then(res => resolve(_.transform(res, (result, full_path) => {
        const file_path = full_path.substring(offset + 1);
        if (options.filter) {
          if (options.filter instanceof RegExp && !file_path.match(options.filter)) { return result; }
          if (typeof options.filter === "function" && !options.filter(file_path, _.last(file_path.split("\\")))) { return result; }
        }
        return _.merge(result, flat.unflatten({[file_path]: require(full_path)}, {delimiter: "\\"}));
      }, {})))
      .catch(err => reject(err));
    })
    .then(res => options.transform ? _.transform(res, options.transform, {}) : res);
  }
  
  export function sync(options: iIncludeOptions): {[key: string]: string} {
    console.log(fs.readdirSync(options.path));
    return {};
  }
  
  function walkDirAsync(dir: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) { reject(err); }
        Promise.all(_.map(files, file => new Promise((resolve, reject) => {
          const file_path = path.resolve(dir, file);
          fs.stat(file_path, (err, stats) => err ? reject(err) : resolve(stats.isDirectory() ? walkDirAsync(file_path) : file_path));
        })))
        .then(res => resolve(<string[]>_.flattenDeep(res)))
        .catch(err => reject(err));
      });
    });
  }
  
}

interface iIncludeOptions {
  path: string
  sync?: boolean
  filter?: RegExp | ((file_path: string, file_name: string) => boolean)
  transform?: any
}
