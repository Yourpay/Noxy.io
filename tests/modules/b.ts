import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "b", version: "1.0.0", module_dependencies: {e: "1.0.0", f: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("B resolved!");
  
});