import {init_chain} from "../../app";
import {Application} from "../../modules/Application";
import Route from "../../objects/Route";
import * as Promise from "bluebird";

init_chain.addPromise("publicize", (resolve, reject) => {
  
  const route = new Route({method: "POST", path: "/api/user", flag_active: 1});
  console.log(route);
  route.validate()
  .then(res => { console.log(res);})
  .catch(res => { console.log(res);});
  
  Promise.all([
    new Route({method: "POST", path: "/api/user", flag_active: 1}).save(),
    new Route({method: "POST", path: "/api/user/login", flag_active: 1}).save()
  ])
  .catch(err => reject(err))
  .tap(() => {
    console.log("test");
    Application.listen()
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
});

