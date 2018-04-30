import {init_chain} from "../../app";
import {Application} from "../../modules/Application";
import Route from "../../objects/Route";
import * as Promise from "bluebird";
import * as _ from "lodash";

init_chain.addPromise("publicize", (resolve, reject) => {
  
  Promise.all(_.map(["/api/user", "/api/user/login"], path => {
    const route = new Route({method: "POST", path: path, flag_active: 1});
    route.validate()
    .catch(err => err.code === "404.db.select" ? route : reject(err))
    .then(res => {
      if (res.validated) { return resolve(res); }
      res.save()
      .then(res => resolve(res))
      .catch(err => reject(err));
    });
  }))
  .catch(err => reject(err))
  .tap(() => {
    Application.listen()
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
});
