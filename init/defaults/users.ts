import {init_chain, roles, users} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as Promise from "bluebird";

init_chain.addPromise("user", (resolve, reject) => {
  Promise.all(_.map(env.users, (user, key) =>
    new Promise((resolve, reject) => {
      users[key] = new User(user);
      users[key].validate()
      .catch(err => err.code === "404.db.select" ? this : reject(err))
      .then(res => {
        if (users[key].validated) { return resolve(res); }
        users[key].save()
        .then(res => resolve(res))
        .catch(err => reject(err));
      });
    })
  ))
  .then(res => resolve(res))
  .catch(err => reject(err));
});
