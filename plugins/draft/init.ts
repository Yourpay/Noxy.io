import * as Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import {publicize_queue} from "../../init/publicize";
import * as Application from "../../modules/Application";
import * as Cache from "../../modules/Cache";
import Route from "../../resources/Route";

export const subdomain = "draft";

publicize_queue.promise("setup", (resolve, reject) => {
  
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), subdomain),
    Application.addRoute(subdomain, "/", "*", "GET", (request, response, next) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
  .then(res => resolve(res))
  .error(err => resolve(err));
  
});

publicize_queue.promise("publish", (resolve, reject) =>
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, Cache.toKey([subdomain, "/*", "GET"])).then(route => Application.updateRoute(_.set(route, "flag_active", 1)))
  ])
  .then(res => resolve(res))
  .catch(err => reject(err))
);