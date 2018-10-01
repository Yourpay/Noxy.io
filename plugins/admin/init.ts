import * as Promise from "bluebird";
import * as path from "path";
import {ePromisePipeStagesInitPublicize, publicize_pipe} from "../../init/publicize";
import * as Application from "../../modules/Application";

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () =>
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), "admin"),
    // Application.addRoute(env.subdomains.api, "db", "/", "GET", (request, response, next) => {
    //   response.json(Response.json(200, "any", _.transform(Resource.list, (result, value, key) => _.merge(result, {[key.split("::")[1]]: _.keys(value.__columns)}), {})));
    // }),
    Application.addRoute("admin", "/", "*", Application.methods.GET, (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
);

publicize_pipe.add("PUBLISH", () =>
  Promise.all([
    // Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, Cache.keyFromSet(["admin", "/*", "GET"])).then(route => Application.updateRoute(route))
  ])
);