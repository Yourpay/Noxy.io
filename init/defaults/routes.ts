import {HTTPService} from "../../modules/HTTPService";
import {elements, init_chain} from "../../app";
import User from "../../objects/User";
import Element from "../../classes/Element";
import * as env from "../../env.json";
import * as jwt from "jsonwebtoken";
import * as Promise from "bluebird";
import * as _ from "lodash";
import ServerError from "../../classes/ServerError";

init_chain.addPromise("route", resolve => {
  
  const api = HTTPService.subdomain("api");
  
  _.each(elements, (element: typeof Element | any) =>
    api.router("/" + element.__type)
    .param("id", (request, response, next) => response.locals.id = request.params.id && next())
    .endpoint("GET", "/", HTTPService.auth, (request, response, next) => {
      new Promise((resolve, reject) => {
        if (request.query.start < 0) { request.query.start = 0; }
        if (request.query.limit < 0 || request.query.limit > 100) { request.query.limit = 100; }
        element.retrieve(request.query.start, request.query.limit, {user_created: request.user.id})
        .then(res => resolve(_.transform(res, (r, v: any) => (v = new element(v).toObject()) && _.set(r, v.id, v), {})))
        .catch(err => reject(err));
      })
      .then(res => response.json(HTTPService.response(res)))
      .catch(err => response.status(err.code).json(HTTPService.response(err)));
    })
  );
  
  HTTPService.addRoute("POST", {path: "/api/user", parameter: "/login"}, HTTPService.auth, (request, response) => {
    new Promise((resolve, reject) =>
      new Promise((resolve, reject) => {
        if ((request.body.username || request.body.email) && request.body.password) { return resolve(request.body); }
        if (request.get("Authorization")) { return jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => !err ? resolve(decoded) : reject(new ServerError(401, "jwt"))); }
        reject(new ServerError(401, "any"));
      })
      .then(res =>
        new User(res).validate()
        .then(res => {
          if (!res.exists || request.body.password && !User.generateHash(request.body.password, res.salt).equals(res.hash)) { return reject(new ServerError(401, "any"));}
          res.time_login = Date.now();
          res.save()
          .then(res => resolve(jwt.sign(res.toObject(), env.tokens.jwt, {expiresIn: "7d"})))
          .catch(err => reject(err));
        })
        .catch(err => reject(err)))
      .catch(err => reject(err)))
    .then(res => response.json(HTTPService.response(res)))
    .catch(err => response.status(err.code).json(HTTPService.response(err)));
  });
  
  resolve();
  
});

