import {init_chain} from "../../app";
import User from "../../objects/User";
import * as _ from "lodash";

init_chain.addPromise("user", (resolve, reject) => {
  const user = new User({id: "test", username: "something else", email: "test@swag.com", "password": "test"});
  user.save()
    .then(res => console.log("ressss", res), err => console.log("end", err));
  
  console.log("Normal user", user);
  console.log("Parsed user", user.toObject());
});
