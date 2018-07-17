import * as _ from "lodash";
import * as path from "path";
import {env} from "../../app";
import Table from "../../classes/Table";
import {publicize_queue} from "../../init/publicize";
import * as Application from "../../modules/Application";
import * as Responses from "../../modules/Response";
import Route from "../../resources/Route";

publicize_queue.promise("setup", resolve => {
  
  Application.addStatic(path.resolve(__dirname, "./public"), "admin");
  Application.addRoute(env.subdomains.api, "db", "/", "GET", (request, response, next) => {
    response.json(new Responses.JSON(200, "any", _.transform(Table.tables[env.mode], (result, value, key) => _.merge(result, {[key]: _.keys(value.__columns)}), {})));
  });
  Application.addRoute("admin", "/", "*", "GET", (request, response, next) => {
    response.sendFile(path.resolve(__dirname, "./public/index.html"));
  });
  resolve();
  
});

publicize_queue.promise("publish", resolve => {
  
  Promise.all([
    new Route({subdomain: "admin", namespace: "/", path: "*", method: "GET", flag_active: true}).save()
  ])
  .then(res => resolve(res));
  
});