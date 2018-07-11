import * as path from "path";
import {publicize_queue} from "../../init/publicize";
import * as Application from "../../modules/Application";
import Route from "../../resources/Route";

publicize_queue.promise("setup", resolve => {
  
  Application.addStatic(path.resolve(__dirname, "./public"), "admin");
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