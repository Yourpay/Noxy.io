import {elements, init_chain} from "../../app";
import {Application} from "../../modules/Application";
import User from "../../objects/User";
import * as _ from "lodash";

init_chain.addPromise("route", resolve => {
  
  Application.addRoute("POST", {path: "/api/user", parameter: "/login"}, Application.auth, (request, response) => {
    const user = new User(request.body);
    user.validate()
    .then((res) => { console.log(res); })
    .catch((err) => { console.log(err); })
    .finally(() => { response.status(200).json({"yes": "no"}); });
  });
  
  _.each(elements, v => { Application.addElementRouter(v); });
  resolve();
  
});

