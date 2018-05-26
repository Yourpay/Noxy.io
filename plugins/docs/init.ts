import * as path from "path";

import {init_chain} from "../../app";
import {HTTPService} from "../../modules/HTTPService";

export const documentation_types = {
  element:        "documentation/element",
  endpoint:       "documentation/endpoint",
  endpoint_field: "documentation/endpoint/field",
  field:          "documentation/field"
};

init_chain.addPromise("tables", resolve => {

});

init_chain.addPromise("route", resolve => {
  
  HTTPService.subdomain("docs", path.resolve(__dirname, "./public")).router("/").endpoint("GET", "*", (request, response) => {
    response.sendFile(path.resolve(__dirname, "./public/index.html"));
  });
  
  resolve();
  
});

