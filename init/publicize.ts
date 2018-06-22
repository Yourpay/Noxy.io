import PromiseQueue from "../classes/PromiseQueue";
import {env, init_queue} from "../app";
import * as Application from "../modules/Application";
import * as _ from "lodash";
import Table from "../classes/Table";

export const publicize_queue = new PromiseQueue(["setup", "listen"]);

publicize_queue.promise("setup", (resolve, reject) => {
  
  Application.addParam(env.subdomains.api, "id", (request, response, next, id) => (request.query.id = id) && next());
  
  _.each(Table.tables, (tables, database) => database === "coextensive" ? true : _.each(tables, table => Application.addResource(table.__resource)));
  
  resolve();
  
});

publicize_queue.promise("listen", (resolve, reject) => {
  
  Application.publicize()
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});

init_queue.promise("publicize", (resolve, reject) => publicize_queue.execute().then(res => resolve(res), err => reject(err)));
