import {HTTPService} from "../../modules/HTTPService";
import Route from "../../objects/Route";
import Promise from "aigle";
import PromiseQueue from "../../classes/PromiseQueue";
import {init_queue} from "../../app";

export const publicize_chain = new PromiseQueue(["roles", "active", "listen"]);

publicize_chain.promise("active", (resolve, reject) =>
  Promise.map(["/user", "/user/login"], path =>
    new Promise((resolve, reject) =>
      new Route({method: "POST", path: path, subdomain: "api", flag_active: 1}).validate()
      .then(res =>
        res.exists ? resolve(res) : res.save()
        .then(res => resolve(res))
        .catch(err => reject(err))
      )
      .catch(err => reject(err))
    )
  )
  .then(res => resolve(res))
  .catch(err => reject(err))
);

publicize_chain.promise("listen", (resolve, reject) =>
  HTTPService.listen()
  .then(res => resolve(res))
  .catch(err => reject(err))
);

init_queue.promise("publicize", (resolve, reject) => publicize_chain.execute().then(res => resolve(res), err => reject(err)));
