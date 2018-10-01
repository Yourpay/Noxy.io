import * as Promise from "bluebird";
import * as path from "path";
import {ePromisePipeStagesInitPublicize, publicize_pipe} from "../../init/publicize";
import * as Application from "../../modules/Application";

export const subdomain = "draft";

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () =>
  Promise.all([
    Application.addStatic(path.resolve(__dirname, "./public"), subdomain),
    Application.addRoute(subdomain, "/", "*", Application.methods.GET, (request, response) => {
      response.sendFile(path.resolve(__dirname, "./public/index.html"));
    })
  ])
);

publicize_pipe.add(ePromisePipeStagesInitPublicize.PUBLISH, () =>
  Promise.all([
    // Cache.getOne<Route>(Cache.types.RESOURCE, Route.type, Cache.keyFromSet([subdomain, "/*", "GET"])).then(route => Application.updateRoute(_.set(route, "flag_active", 1)))
  ])
);
