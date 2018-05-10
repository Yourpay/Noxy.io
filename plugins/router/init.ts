import {HTTPService} from "../../modules/HTTPService";
import {init_chain} from "../../app";
import ServerError from "../../classes/ServerError";
import * as rp from "request-promise";

console.log("router init");

init_chain.addPromise("route", resolve => {
  
  const user = "admin";
  const pass = "x1E0TGr=&S_iLJ^O";
  const host = "192.168.0.1";
  
  HTTPService.addRoute("GET", "/api/router", HTTPService.auth, (request, response) => {
    return rp({uri: host, auth: {user: user, password: pass}})
    .then(res => response.send(res))
    .catch(err => response.status(400).json(new ServerError("400.server.any", err)));
  });
  
  resolve();
  
});

