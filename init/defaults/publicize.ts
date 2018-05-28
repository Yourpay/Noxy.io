import {init_chain} from "../../app";
import {HTTPService} from "../../modules/HTTPService";
import Route from "../../objects/Route";
import * as Promise from "bluebird";
import * as _ from "lodash";

init_chain.addPromise("publicize", (resolve, reject) => {
  Promise.all(_.map(["/user", "/user/login"], path =>
    new Promise((resolve, reject) =>
      new Route({method: "POST", path: path, subdomain: "api", flag_active: 1}).validate()
      .then(res =>
        res.exists ? resolve(res) : res.save()
        .then(res => resolve(res))
        .catch(err => reject(err))
      )
      .catch(err => reject(err))
    )))
  .then(() =>
    HTTPService.listen()
    .then(res => resolve(res))
    .catch(err => reject(err)))
  .catch(err => reject(err));
});

