import PromiseQueue from "../classes/PromiseQueue";
import {env, init_queue} from "../app";
import * as _ from "lodash";
import Table from "../classes/Table";
import Route from "../resources/Route";

export const publicize_queue = new PromiseQueue(["setup", "listen"]);

publicize_queue.promise("setup", (resolve, reject) => {
  const Application = require("../modules/Application");
  Application.addParam(env.subdomains.api, "id", (request, response, next, id) => (request.query.id = id) && next());
  _.each(Table.tables, (tables, database) => database === "coextensive" ? true : _.each(tables, table => Application.addResource(table.__resource)));
  resolve();
});

publicize_queue.promise("listen", (resolve, reject) =>
  require("../modules/Application").publicize()
  .then(res => resolve(res))
  .catch(err => reject(err))
);

publicize_queue.promise("publish", (resolve, reject) => {
  Promise.all([
    new Route({subdomain: env.subdomains.api, method: "POST", namespace: require("../resources/User").default.__type, path: "/login", flag_active: true}).save()
  ])
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("publicize", (resolve, reject) => publicize_queue.execute().then(res => resolve(res), err => reject(err)));
