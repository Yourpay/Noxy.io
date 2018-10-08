import * as Promise from "bluebird";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import {env, init_pipe} from "../globals";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as Application from "../modules/Application";
import * as PromisePipe from "../modules/PromisePipe";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";
import User from "../resources/User";

export enum ePromisePipeStagesInitPublicize {
  SETUP   = 0,
  PUBLISH = 1,
  LISTEN  = 2,
  PLUGIN  = 3
}

export const publicize_pipe = PromisePipe(ePromisePipeStagesInitPublicize);

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () =>
  Application.addRoute(env.subdomains.api, User.type, "login", Application.methods.POST, (request, response) =>
    User.login(request.body, request.get("Authorization"))
    .then(user => _.merge({id: user.uuid}, _.pick(user, ["username", "email", "time_login"])))
    .then(user => Promise.map(User.login_callbacks, fn => fn(user)).reduce((result, value) => _.merge(result, value), user))
    .then(user => Response.json(200, "any", {jwt: jwt.sign(user, env.tokens.jwt, {expiresIn: "7d"})}))
    .catch(err => err instanceof Response.json ? err : Response.json(500, "any", err))
    .then(res => response.status(res.code).json(res))
  )
);

publicize_pipe.add(ePromisePipeStagesInitPublicize.PUBLISH, () =>
  Promise.all([
    Application.getRoute(env.subdomains.api, User.type, "login", Application.methods.POST).then(r => Application.updateRoute(r.subdomain, r.namespace, r.path, r.method, _.set(r, "flag_active", 1)))
  ])
);

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () => {
  Application.addParam("id", env.subdomains.api, (request, response, next, id) => (response.locals.id = id) && next());
  Application.addRoute(env.subdomains.api, "/", "/", Application.methods.GET, (request: express.Request, response: express.Response) => response.json(Response.json(200, "any")));
  
  return Promise.map(_.values(Resource.list), resource =>
    Promise.all([
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.get(request.query.start, request.query.limit)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.POST, (request: express.Request, response: express.Response) => {
        resource.post(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.getByID(response.locals.id)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => !Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.PUT, (request: express.Request, response: express.Response) => {
        resource.put(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/count", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.count()
        .then(res => Response.json(200, "any", {count: res}, response.locals.time))
        .catch(err => Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.DELETE, (request: express.Request, response: express.Response) => {
        resource.delete(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Application.isAdmin(response.locals.roles) ? Response.error(err.code, err.type, err) : Response.json(err.code, err.type))
        .then(res => response.json(res));
      })
    ])
  );
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.LISTEN, () => Application.publicize());

init_pipe.add(ePromisePipeStagesInit.PUBLICIZE, () => publicize_pipe.resolve());
