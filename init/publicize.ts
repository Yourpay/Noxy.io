import * as _ from "lodash";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import Table from "../classes/Table";

export const publicize_queue = new PromiseQueue(["setup", "listen"]);

publicize_queue.promise("setup", (resolve, reject) => {
  const Application = require("../modules/Application");
  Application.addParam(env.subdomains.api, "id", (request, response, next, id) => (request.query.id = id) && next());
  Promise.all(_.reduce(Table.tables, (result, table) => _.concat(result, _.flattenDeep(_.map(Application.addResource(table.__resource), r => _.values(r)))), []))
  .then(res => resolve(res))
  .catch(err => reject(err));
});

publicize_queue.promise("listen", (resolve, reject) =>
  require("../modules/Application").publicize() ? resolve() : reject()
);

init_queue.promise("publicize", (resolve, reject) => publicize_queue.execute().then(res => resolve(res), err => reject(err)));
