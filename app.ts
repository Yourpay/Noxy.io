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
  if (err.code) { console.log("Error code:", err.code); }
  if (err.type) { console.log("Error type:", err.type); }
  if (err.message) { console.log("Error message:", err.message); }
  if (err.content) { console.log("Error content:", err.content); }
  if (err.log) { console.log(err.log); }
  if (err.stack) { console.log(err.stack); }
  process.exitCode = 1;
});
