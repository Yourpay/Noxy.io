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

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () => {
  User.addLoginCallback((request, response, user) => {
    if (!request.body.email || !request.body.password) { return Promise.resolve(user); }
    return new User(request.body).validate()
    .then(user => {
      if (!user.exists || !_.isEqual(user.hash, User.generateHash(request.body.password, user.salt))) { return user; }
      return _.set(user, "time_login", response.locals.time).save({update_protected: true});
    });
  });
  
  User.addLoginCallback((request, response, user) => {
    if (user instanceof User && user.exists) { return Promise.resolve(user); }
    return Promise.promisify(jwt.verify)(request.get("Authorization"), env.tokens.jwt)
    .then(decoded => new User(decoded).validate())
    .then(user => _.set(user, "time_login", Date.now()).save())
    .catch(() => user);
  });
  
  return Application.addRoute(env.subdomains.api, User.type, "login", Application.methods.POST, (request, response) =>
    User.login(request, response)
    .then(res => Response.json(200, "any", res, response.locals.time))
    .catch(err => Response.error(err.code, err.type, err))
    .then(res => Application.respond(response, res))
  );
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.PUBLISH, () =>
  Promise.all([
    Application.activate(env.subdomains.api, User.type, "login", Application.methods.POST)
  ])
);

publicize_pipe.add(ePromisePipeStagesInitPublicize.SETUP, () => {
  Application.addParam("id", env.subdomains.api, (request, response, next, id) => (response.locals.id = id) && next());
  
  return Promise.map(_.values(Resource.list), resource =>
    Promise.all([
      Application.addRoute(env.subdomains.api, "/", "/", Application.methods.GET, (request: express.Request, response: express.Response) =>
        response.json(Response.json(200, "any"))
      ),
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.get(request.query.start, request.query.limit)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/", Application.methods.POST, (request: express.Request, response: express.Response) => {
        resource.post(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.getByID(response.locals.id)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.PUT, (request: express.Request, response: express.Response) => {
        resource.put(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/count", Application.methods.GET, (request: express.Request, response: express.Response) => {
        resource.count()
        .then(res => Response.json(200, "any", {count: res}, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      }),
      Application.addRoute(env.subdomains.api, resource.type, "/:id", Application.methods.DELETE, (request: express.Request, response: express.Response) => {
        resource.delete(request.body)
        .then(res => Response.json(200, "any", res, response.locals.time))
        .catch(err => Response.error(err.code, err.type, err))
        .then(res => Application.respond(response, res));
      })
    ])
  );
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.LISTEN, () => Application.publicize());

init_pipe.add(ePromisePipeStagesInit.PUBLICIZE, () => publicize_pipe.resolve());
