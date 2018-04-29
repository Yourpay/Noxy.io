import {init_chain} from "../../app";
import {Application} from "../../modules/Application";
import ElementRouter from "../../classes/ElementRouter";
import User from "../../objects/User";

init_chain.addPromise("routes", (resolve, reject) => {
  
  
  Application.addRouter(new ElementRouter(User), "/api" )
  
  console.log(Application);

  
  resolve();
  
});