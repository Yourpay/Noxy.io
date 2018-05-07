import {HTTPService} from "../../modules/HTTPService";
import {elements, init_chain} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as jwt from "jsonwebtoken";
import * as Promise from "bluebird";
import * as _ from "lodash";
import ServerError from "../../classes/ServerError";

init_chain.addPromise("route", resolve => {
  
  HTTPService.addRoute("POST", {path: "/api/user", parameter: "/login"}, HTTPService.auth, (request, response) => {
    new Promise((resolve, reject) =>
      new Promise((resolve, reject) => {
        if ((request.body.username || request.body.email) && request.body.password) { return resolve(request.body); }
        if (request.get("Authorization")) { return jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => !err ? resolve(decoded) : reject(new ServerError("401.server.jwt"))); }
        reject(reject(new ServerError("401.server.any")));
      })
      .then(res =>
        new User(res).validate()
        .then(res => {
          if (!res.exists || request.body.password && !User.generateHash(request.body.password, res.salt).equals(res.hash)) { return reject(new ServerError("401.server.any"));}
          res.time_login = Date.now();
          res.save()
          .then(res => resolve(jwt.sign(res.toObject(), env.tokens.jwt, {expiresIn: "7d"})))
          .catch(err => reject(err));
        })
        .catch(err => reject(err)))
      .catch(err => reject(err)))
    .then(res => response.json(HTTPService.response(res)))
    .catch(err => response.status(err.code.split(".")[0]).json(HTTPService.response(err)));
  });
  
  _.each(elements, v => { HTTPService.addElementRouter(v); });
  resolve();
  
});

