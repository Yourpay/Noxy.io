import * as Promise from "bluebird";
import * as express from "express";
import * as _ from "lodash";
import {env, init_pipe} from "../globals";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as Application from "../modules/Application";
import * as PromisePipe from "../modules/PromisePipe";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";

export enum ePromisePipeStagesInitPublicize {
  SETUP   = 0,
  PUBLISH = 1,
  LISTEN  = 2,
  PLUGIN  = 3
}

export const publicize_pipe = PromisePipe(ePromisePipeStagesInitPublicize);

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () => {
  Application.addParam("id", env.subdomains.api, (request, response, next, id) => (response.locals.id = id) && next());
  return Promise.map(_.values(Resource.list), resource =>
    Promise.all([
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.get(request.query.start, request.query.limit)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.POST, (request: express.Request, response: express.Response) => {
        resource.post(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.get(response.locals.id)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.PUT, (request: express.Request, response: express.Response) => {
        resource.get(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/count", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.count()
        .then(res => Response.json(200, "any", {count: res}, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.DELETE, (request: express.Request, response: express.Response) => {
        resource.get(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => response.json(res));
      })
    ])
  );
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.LISTEN, () => Application.publicize());

init_pipe.add(ePromisePipeStagesInit.PUBLICIZE, () => publicize_pipe.resolve());
