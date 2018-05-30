import {HTTPService} from "../../modules/HTTPService";
import {init_chain} from "../../app";
import User from "../../objects/User";
import Element from "../../classes/Element";
import * as env from "../../env.json";
import * as jwt from "jsonwebtoken";
import * as Promise from "bluebird";
import * as _ from "lodash";
import ServerMessage from "../../classes/ServerMessage";
import {Include} from "../../modules/Include";
import * as path from "path";
import PromiseChain from "../../classes/PromiseChain";
import PromiseQueue from "../../classes/PromiseQueue";

export const route_chain = new PromiseQueue(["subdomain", "route"]);

route_chain.promise("subdomain", resolve => {
  HTTPService.subdomain("www");
  HTTPService.subdomain("api");
});

route_chain.promise("route", (resolve, reject) => {



});

init_chain.addPromise("route", resolve => {
  
  const base = HTTPService.subdomain("www");
  const api = HTTPService.subdomain("api");
  const options = {
    path:      path.resolve(__dirname, "../../objects"),
    transform: (r, v) => _.set(r, v.default.__type, v.default)
  };
  
  Include(options)
  .then((res: {[type: string]: typeof Element}) =>
    _.each(res, (element: typeof Element | any) =>
      api.router("/" + element.__type)
      .param("id", (request, response, next) => response.locals.id = request.params.id && next())
      .endpoint("GET", "/", HTTPService.auth, (request, response) =>
        new Promise((resolve, reject) => {
          if (request.query.start < 0) { request.query.start = 0; }
          if (request.query.limit < 0 || request.query.limit > 100) { request.query.limit = 100; }
          element.retrieve(request.query.start, request.query.limit, {user_created: response.locals.user.id})
          .then(res => resolve(_.transform(res, (r, v: any) => (v = new element(v).toObject()) && _.set(r, v.id, v), {})))
          .catch(err => reject(err));
        })
        .then(res => response.json(HTTPService.response(res)))
        .catch(err => response.status(err.code).json(HTTPService.response(err)))
      )
      .endpoint("GET", "/:id", HTTPService.auth, (request, response) =>
        new Promise((resolve, reject) =>
          new element(response.locals.id).validate()
          .then(res => !element.__fields.user_created || response.locals.user.id === res.user_created ? resolve(res.toObject()) : reject(new ServerMessage(404, "any")))
          .catch(err => reject(err))
        )
        .then(res => response.json(HTTPService.response(res)))
        .catch(err => response.status(err.code).json(HTTPService.response(err)))
      )
      .endpoint("POST", "/", HTTPService.auth, (request, response) =>
        new Promise((resolve, reject) =>
          new element(request.body).validate()
          .then(res =>
            res.exists ? reject(new ServerMessage(400, "duplicate")) : res.save(response.locals.user)
            .then(res => resolve(res.toObject()))
            .catch(err => reject(err))
          )
          .catch(err => reject(err))
        )
        .then(res => response.json(HTTPService.response(res)))
        .catch(err => response.status(err.code).json(HTTPService.response(err)))
      )
      .endpoint("PUT", "/:id", HTTPService.auth, (request, response) =>
        new Promise((resolve, reject) =>
          new element(request.body).validate()
          .then(res =>
            !res.exists || (element.__fields.user_created && response.locals.user.id === res.user_created) ? reject(new ServerMessage(404, "any")) : res.save(response.locals.user)
            .then(res => resolve(res.toObject()))
            .catch(err => reject(err))
          )
          .catch(err => reject(err))
        )
        .then(res => response.json(HTTPService.response(res)))
        .catch(err => response.status(err.code).json(HTTPService.response(err)))
      )
      .endpoint("DELETE", "/:id", HTTPService.auth, (request, response) =>
        new Promise((resolve, reject) =>
          new element(request.body).validate()
          .then(res =>
            !res.exists || (element.__fields.user_created && response.locals.user.id === res.user_created) ? reject(new ServerMessage(404, "any")) : res.remove(response.locals.user)
            .then(res => resolve(res.toObject()))
            .catch(err => reject(err))
          )
          .catch(err => reject(err))
        )
        .then(res => response.json(HTTPService.response(res)))
        .catch(err => response.status(err.code).json(HTTPService.response(err)))
      )
    )
  );
  
  api.router("/user").endpoint("POST", "/login", HTTPService.auth, (request, response) =>
    new Promise((resolve, reject) =>
      new Promise((resolve, reject) => {
        if ((request.body.username || request.body.email) && request.body.password) { return resolve(request.body); }
        if (response.locals.user) { return resolve(response.locals.user); }
        reject(new ServerMessage(401, "any"));
      })
      .then(res =>
        new User(res).validate()
        .then(res => {
          if (!res.exists || request.body.password && !User.generateHash(request.body.password, res.salt).equals(res.hash)) { return reject(new ServerMessage(401, "any"));}
          res.time_login = Date.now();
          res.save()
          .then(res => {
            const token = jwt.sign(res.toObject(), env.tokens.jwt, {expiresIn: "7d"});
            resolve(token);
          })
          .catch(err => reject(err));
        })
        .catch(err => reject(err)))
      .catch(err => reject(err))
    )
    .then(res => response.json(HTTPService.response(res)))
    .catch(err => response.status(err.code).json(HTTPService.response(err))));
  
  api.router("/").endpoint("GET", "/", (request, response) => response.json(HTTPService.response(new ServerMessage(200, "any"))));
  
  base.router("/").endpoint("GET", "/", (request, response) => response.json(HTTPService.response(new ServerMessage(200, "any"))));
  
  api.router("/test").endpoint("GET", "/", (request, response) => response.json(HTTPService.response(new ServerMessage(200, "any"))));
  
  api.router("/test").endpoint("GET", "/test", (request, response) => response.json(HTTPService.response(new ServerMessage(200, "any"))));
  
  resolve();
  
});
