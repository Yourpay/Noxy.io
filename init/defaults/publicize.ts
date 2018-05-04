import {init_chain} from "../../app";
import {HTTPService} from "../../modules/HTTPService";
import Route from "../../objects/Route";
import * as Promise from "bluebird";
import * as _ from "lodash";

init_chain.addPromise("publicize", (resolve, reject) => {
  
  Promise.all(_.map(["/api/user", "/api/user/login"], path => new Promise((resolve, reject) => {
    const route = new Route({method: "POST", path: path, flag_active: 1});
    route.validate()
    .catch(err => err.code === "404.db.select" ? route : reject(err))
    .then(res => {
      if (!res) { return false; }
      if (res.validated) { return resolve(res); }
      res.save()
      .then(res => resolve(res))
      .catch(err => reject(err));
    });
  })))
  .then(() => {
    HTTPService.listen()
    .then(res => resolve(res))
    .catch(err => reject(err));
  })
  .catch(err => reject(err));
  
});

