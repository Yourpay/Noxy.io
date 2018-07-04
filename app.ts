import Role from "./resources/Role";
import User from "./resources/User";
import * as Include from "./modules/Include";
import PromiseQueue from "./classes/PromiseQueue";
import * as environmentals from "./env.json";

export const env = environmentals;
export const users: {[id: string]: User} = {};
export const roles: {[id: string]: Role} = {};

export const init_queue = new PromiseQueue(["db", "resource", "publicize"]);

Include({path: __dirname + "/init"})
.then(() => Include({path: __dirname + "/plugins", filter: /^[\w\d\s]+\\init\.js/}))
.then(() => init_queue.execute())
.then(() => console.log("Server is up and running."))
.catch(err => {
  console.error(err);
  process.exitCode = 1;
});

