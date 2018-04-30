import {Application} from "../../modules/Application";
import {elements, init_chain} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";

init_chain.addPromise("route", resolve => {
  
  Application.addRoute("POST", {path: "/api/user", parameter: "/login"}, Application.auth, (request, response) => {
    new User(request.body).validate()
    .then(res => {
      if (!User.generateHash(request.body.password, res.salt).equals(res.hash)) { return response.sendStatus(401); }
      const token = jwt.sign({id: res.uuid}, env.tokens.jwt, {expiresIn: "7d"});
      return response.json(Application.response(_.merge({jwt: token}, res.toObject())));
    })
    .catch(err => response.sendStatus(401));
  });
  
  Application.addRoute("POST", {path: "/api/user", parameter: "/refresh"}, Application.auth, (request, response) => {
    jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => {
      if (err) { return response.sendStatus(401); }
      new User(decoded).validate()
      .then(res => {
        const token = jwt.sign({id: decoded.id}, env.tokens.jwt, {expiresIn: "7d"});
        return response.json(Application.response(_.merge({jwt: token}, res.toObject())));
      })
      .catch(err => console.log(err) || response.sendStatus(401));
    });
  });
  
  _.each(elements, v => { Application.addElementRouter(v); });
  resolve();
  
});

