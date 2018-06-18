import PromiseQueue from "../../classes/PromiseQueue";
import {db_queue} from "../../init/defaults/db";
import * as Include from "../../modules/Include";
import * as path from "path";

export const v5_queue = new PromiseQueue(["init"]);

v5_queue.promise("init", () => {
  
  db_queue.promise("register", (resolve, reject) => {
    Include({path: path.resolve(__dirname, "./master")})
    .then(res => resolve(res))
    .catch(err => reject(err));
  });
  
});

v5_queue.execute()
.then(() => console.log("v5_queue plugin loaded successfully."))
.catch(err => console.error("v5_queue plugin load failed with:", err));
