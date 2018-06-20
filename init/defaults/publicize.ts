import PromiseQueue from "../../classes/PromiseQueue";
import {env, init_queue} from "../../app";
import Domain from "../../classes/Domain";

export const publicize_chain = new PromiseQueue(["setup", "listen"]);

publicize_chain.promise("setup", (resolve, reject) => {
  
  const api = Domain.subdomains[env.subdomains.api];
  const api_base = api.endpoints["/"];
  
  api_base.addRoute("GET", "/", (request, response) => {
    console.log(request);
    response.status(200).send("api");
  });
  
  const www = Domain.subdomains[env.subdomains.default];
  const www_base = www.endpoints["/"];
  
  www_base.addRoute("GET", "/", (request, response) => {
    console.log(request);
    response.status(200).send("www");
  });
  
  resolve();
  
});

publicize_chain.promise("listen", (resolve, reject) => {
  
  Domain.publicize()
  .then(res => resolve(res))
  .catch(err => reject(err));
  
});

init_queue.promise("publicize", (resolve, reject) => publicize_chain.execute().then(res => resolve(res), err => reject(err)));
