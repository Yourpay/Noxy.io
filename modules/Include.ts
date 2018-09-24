import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";
import * as minimatch from "minimatch";
import * as path from "path";
import {base_dir} from "../globals";
import {iIncludeFn, iIncludeOptions, iIncludeService} from "../interfaces/iInclude";

const Service: iIncludeFn = Default;

function Default(directory: string, options?: iIncludeOptions & {sync?: boolean}): any | Promise<any>;
function Default(directory: string, options?: iIncludeOptions & {sync: true}): any;
function Default(directory: string, options?: iIncludeOptions & {sync: false}): Promise<any>;
function Default(directory: string, options: iIncludeOptions = {}) {
  return options.sync ? sync(directory, options) : async(directory, options);
}

function sync(directory: string, options: Exclude<iIncludeOptions, "sync"> = {}) {
  const dir_path = path.resolve(directory.match(/^[.\/\\]/) ? base_dir : "", directory);
  
  return _.reduce(syncFn(dir_path, options, []), (result, file_path) => {
    return set(result, options.transform ? options.transform(file_path) : file_path, require(path.resolve(dir_path, file_path)), options.hierarchy);
  }, {});
}

function syncFn(directory, options, result = [], base_path?) {
  const files = fs.readdirSync(directory);
  if (!base_path) { base_path = directory; }
  
  return _.reduce(files, (result, file) => {
    const file_path = path.resolve(directory, file);
    const file_stats = fs.statSync(file_path);
    const file_key = path.relative(base_path, path.resolve(directory, file)).replace(/\\/g, "/");
    if (file_stats.isDirectory()) {
      return options.recursive || options.hierarchy ? syncFn(file_path, options, result, base_path) : result;
    }
    if (options.filter && ((typeof options.filter === "function" && !options.filter(file_key)) || (typeof options.filter === "string" && !minimatch(file_key, options.filter)))) {
      return result;
    }
    return _.concat(result, file_key);
  }, result);
}

function async(directory: string, options: Exclude<iIncludeOptions, "sync">) {
  const dir_path = path.resolve(directory.match(/^[.\/\\]/) ? base_dir : "", directory);
  
  return Promise.reduce<string, {[key: string]: any}>(asyncFn(dir_path, options, []), (result, file_path) => {
    return set(result, options.transform ? options.transform(file_path) : file_path, require(path.resolve(dir_path, file_path)), options.hierarchy);
  }, {});
}

function asyncFn(directory, options, result = [], base_path?) {
  if (!base_path) { base_path = directory; }
  
  return new Promise<string[]>((resolve, reject) => fs.readdir(directory, (err, files) => !err ? resolve(files) : reject(err)))
  .reduce((result, file) => {
    const file_path = path.resolve(directory, file);
    const file_key = path.relative(base_path, path.resolve(directory, file)).replace(/\\/g, "/");
    return new Promise<fs.Stats>((resolve, reject) => { fs.stat(file_path, (err, file_stats) => !err ? resolve(file_stats) : reject(err)); })
    .then(file_stats => {
      if (file_stats.isDirectory()) {
        return options.recursive || options.hierarchy ? asyncFn(file_path, options, result, base_path) : result;
      }
      if (options.filter && ((typeof options.filter === "function" && !options.filter(file_key)) || (typeof options.filter === "string" && !minimatch(file_key, options.filter)))) {
        return result;
      }
      return _.concat(result, file_key);
    });
  }, result);
  
}

function set(object: object, path: string | string[], value: any, hierarchy: boolean) {
  if (hierarchy) {
    if (!_.isArray(path)) { path = path.split("/"); }
    if (path.length > 1) {
      if (!object[path[0]]) { object[path[0]] = {}; }
      set(object[path.shift()], path, value, hierarchy);
    }
    else {
      object[path[0]] = value;
    }
  }
  else {
    object[_.join(_.concat(path), "")] = value;
  }
  return object;
}

const exported: iIncludeService = _.assign(
  Service,
  {
    sync:  sync,
    async: async
  }
);

export = exported;
