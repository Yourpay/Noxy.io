import {HTTPService} from "../../modules/HTTPService";
import {elements, init_chain} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as jwt from "jsonwebtoken";
import * as Promise from "bluebird";
import * as _ from "lodash";

init_chain.addPromise("route", resolve => {
  
  HTTPService.addRoute("POST", {path: "/api/user", parameter: "/login"}, HTTPService.auth, (request, response) => {
    new Promise((resolve, reject) => {
      if (request.get("Authorization")) { return jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => !err ? resolve(decoded) : reject(err)); }
      if (request.body.password) { return resolve(request.body); }
      reject();
    })
    .then(res => {
      new User(res).validate()
      .then(res => {
        if (request.body.password && !User.generateHash(request.body.password, res.salt).equals(res.hash)) { return response.sendStatus(401); }
        res.time_login = Date.now();
        res.save()
        .then(res => response.json(HTTPService.response(jwt.sign(res.toObject(), env.tokens.jwt, {expiresIn: "7d"}))))
        .catch(err => response.sendStatus(500));
      })
      .catch(err => response.sendStatus(401));
    })
    .catch(err => response.sendStatus(401));
  });
  
  _.each(elements, v => { HTTPService.addElementRouter(v); });
  resolve();
  
});

