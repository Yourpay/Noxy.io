import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {env} from "../../app";
import Table from "../../classes/Table";
import {publicize_queue} from "../../init/publicize";
import * as Application from "../../modules/Application";
import * as Cache from "../../modules/Cache";
import * as Response from "../../modules/Response";
import Route from "../../resources/Route";

publicize_queue.promise("setup", (resolve, reject) => {
  
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), "docs"),
    Application.addRoute("docs", "/", "*", "GET", (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
  .then(res => resolve(res))
  .error(err => resolve(err));
  
});

publicize_queue.promise("publish", (resolve, reject) => {
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.__type, Cache.toKey(["admin", "/*", "GET"])).then(route => Application.updateRoute(route))
  ])
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});