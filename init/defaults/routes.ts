import {init_chain} from "../../app";
import {Application} from "../../modules/Application";
import User from "../../objects/User";
import Role from "../../objects/Role";
import Route from "../../objects/Route";

init_chain.addPromise("route", (resolve, reject) => {
  
  Application.addRoute("POST", {path: "/api/user", parameter: "/login"}, Application.auth, (request, response, next) => {
    const user = new User(request.body);
    user.validate()
    .then((res) => { console.log(res); })
    .catch((err) => { console.log(err); })
    .finally(() => { response.status(200).json({"yes": "no"}); });
  });
  
  Application.addElementRouter(User);
  Application.addElementRouter(Role);
  
  resolve();
  
});

