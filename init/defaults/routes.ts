import {init_chain, tables} from "../../app";
import * as _ from "lodash";

init_chain.addPromise("routes", (resolve, reject) => {
  
  _.each(tables, (table, key) => {
    console.log(key, table);
  });
  resolve();
  
});