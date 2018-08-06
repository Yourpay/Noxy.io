import * as _ from "lodash";
import PromiseQueue from "./classes/PromiseQueue";
import * as environmentals from "./env.json";
import * as Cache from "./modules/Cache";
import * as Include from "./modules/Include";

export const env = _.merge(environmentals, {mode: process.env.NODE_ENV || environmentals.mode});
export const init_queue = new PromiseQueue(["db", "resource", "publicize"]);

Include({path: __dirname + "/init"})
.then(() => Include({path: __dirname + "/plugins", filter: /^[\w\d\s]+\/init\.js/}))
.then(() => init_queue.execute())
.then(() => console.log("Server is up and running."))
.catch(err => {
  console.error(err);
  process.exitCode = 1;
});

Cache("resource", "user", "test", {test: true});
Cache.show();