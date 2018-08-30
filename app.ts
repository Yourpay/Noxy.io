import * as _ from "lodash";
import PromiseQueue from "./classes/PromiseQueue";
import * as environmentals from "./env.json";
import {cResourceConstructor, eResourceType} from "./interfaces/iResource";
import * as Include from "./modules/Include";
import * as Resource from "./modules/Resource";
import User from "./resources/User";

export const env = _.merge(environmentals, {mode: process.env.NODE_ENV || environmentals.mode});
export const init_queue = new PromiseQueue(["db", "resource", "publicize"]);

Include({path: __dirname + "/init"})
.then(() => Include({path: __dirname + "/plugins", filter: /^[\w\d\s]+\/init\.js/}))
.then(() => init_queue.execute())
.tap(() => {
  console.log("Server is up and running.");
})
.catch(err => {
  console.log("Server could not start due to the following error:");
  console.log("--------------------------------------------------");
  console.log(err);
  process.exitCode = 1;
});

const definition = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  user_created: Resource.Table.toRelationColumn<eResourceType>(eResourceType.USER),
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

const a = Resource<eResourceType, cResourceConstructor>(
  eResourceType.ROLE,
  Resource.Constructor,
  definition,
  options
);
const b = new a();

console.log("Resource", a);
console.log("Instance", b);
console.log("ID", b.id, b.uuid);
console.log("Table", a.table);
