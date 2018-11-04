import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "a", version: "1.0.0", module_dependencies: {b: "1.0.0", c: "1.0.0", d: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("A resolved!");
  
});