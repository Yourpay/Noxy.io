import PromiseChain from "./classes/PromiseChain";
import * as reqall from "require-all";
import DBPool from "./classes/DBPool";
import * as _ from "lodash";

export const db: { [key: string]: DBPool } = {};
export const users = {};
export const roles = {};
export const init_chain = new PromiseChain();

init_chain.addLink("db");
init_chain.addLink("user");
init_chain.addLink("role");
reqall(__dirname + "/init");
init_chain.cycle()
.then((res) => {
  console.log(users);
  console.log(roles);
})
.catch(err => console.error(err));
