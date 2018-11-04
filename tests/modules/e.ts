import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "e", version: "1.0.0", module_dependencies: {f: "1.0.0", i: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("E resolved!");
  
});