import {init_chain} from "../../app";
import User from "../../objects/User";
import * as _ from "lodash";

init_chain.addPromise("user", (resolve, reject) => {
  const user = new User({id: "test", username: "something else", "password": "test"});
  
  console.log("Normal user", user);
  console.log("Parsed user", user.toObject());
});
