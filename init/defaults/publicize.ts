import PromiseQueue from "../../classes/PromiseQueue";
import {init_queue} from "../../app";
import * as express from "express";
import * as http from "http";
import * as vhost from "vhost";

export const publicize_chain = new PromiseQueue(["setup", "listen"]);

publicize_chain.promise("setup", (resolve, reject) => {
  
  const app = express();
  http.createServer(app).listen(80);
  
  const api = express.Router();
  const www = express.Router();
  
  app.use(vhost("api.localhost", api));
  app.use("/", www);
  
  api.get("/", (request, response) => { response.send("api"); });
  www.get("/", (request, response) => { response.send("www"); });
  
  // const api = Domain.subdomains[env.subdomains.api];
  // const api_base = api.endpoints["/"];
  //
  // api_base.addRoute("GET", "/", (request, response) => {
  //   console.log(request);
  //   response.status(200).send("api");
  // });
  //
  // const www = Domain.subdomains[env.subdomains.default];
  // const www_base = www.endpoints["/"];
  //
  // www_base.addRoute("GET", "/", (request, response) => {
  //   console.log(request);
  //   response.status(200).send("www");
  // });
  
  resolve();
  
});

publicize_chain.promise("listen", (resolve, reject) => {
  
  // Domain.publicize()
  // .then(res => resolve(res))
  // .catch(err => reject(err));
  
  resolve();
  
});

init_queue.promise("publicize", (resolve, reject) => publicize_chain.execute().then(res => resolve(res), err => reject(err)));
