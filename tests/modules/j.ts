import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "j", version: "1.0.0", module_dependencies: {k: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("J resolved!");
  
});