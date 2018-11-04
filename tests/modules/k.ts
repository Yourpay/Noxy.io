import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "k", version: "1.0.0", module_dependencies: {h: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("K resolved!");
  
});