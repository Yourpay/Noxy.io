import * as http from "http";
import * as https from "https";
import * as express from "express";
import Router from "../classes/Router";
import * as fs from "fs";
import * as env from "../env.json";
import * as _ from "lodash";

export namespace Application {
  
  const __routers: { [key: string]: Router } = {};
  const __servers: { [port: number]: http.Server | https.Server } = {};
  const __application: express.Application = express();
  const __certificates: certificates = {};
  
  export function listen(port?: number) {
    if (!port && !__servers[env.ports.http]) {
      __servers[env.ports.http] = http.createServer(__application).listen(env.ports.http);
    }
    if (!port && !__servers[env.ports.https]) {
      try {
        _.merge(__certificates, _.mapValues(env.certificates, path => fs.readFileSync(path)));
        __servers[env.ports.http] = https.createServer(__certificates, __application).listen(env.ports.https);
      }
      catch (e) {
        console.error("Could not initialize https server. Following error given:");
        console.error(e);
      }
    }
  }
  
  export function addRouter(router: Router, path?: string) {
    _.merge(__routers, router.paths(path));
    console.log(__routers);
  }
  
}

interface certificates {

}
