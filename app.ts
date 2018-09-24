import {init_pipe} from "./globals";
import * as Include from "./modules/Include";

Include("./init")
.then(() => Include("./plugins", {recursive: true, filter: "**/init.js"}))
.then(() => init_pipe.resolve())
.tap(() => {
  console.log("Server is up and running.");
})
.catch(err => {
  console.log("Server could not start due to the following error:");
  console.log("--------------------------------------------------");
  console.log(err);
  process.exitCode = 1;
});

