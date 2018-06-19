import PromiseQueue from "../../classes/PromiseQueue";
import {env, init_queue} from "../../app";
import Endpoint from "../../classes/Endpoint";

export const publicize_chain = new PromiseQueue(["setup", "listen"]);

publicize_chain.promise("setup", (resolve, reject) => {
  const base = new Endpoint(env.subdomains.default, "/");
  base.addRoute("GET", "/", (request, response, next) => {
    console.log(request);
    response.status(200).send("200");
  });
  
  const api = new Endpoint(env.subdomains.api, "/");
  base.addRoute("GET", "/", (request, response, next) => {
    console.log(request);
    response.status(200).send("300");
  });
  
  resolve();
  
});

publicize_chain.promise("listen", (resolve, reject) => {
  Endpoint.publicize()
  .then(res => resolve(res))
  .catch(err => reject(err));
});

init_queue.promise("publicize", (resolve, reject) => publicize_chain.execute().then(res => resolve(res), err => reject(err)));
