import {init_chain} from "../../app";
import {HTTPService} from "../../modules/HTTPService";
import * as path from "path";

init_chain.addPromise("tables", resolve => {

});

init_chain.addPromise("route", resolve => {
  
  HTTPService.subdomain("docs", path.resolve(__dirname, "./public")).router("/").endpoint("GET", "*", (request, response) => {
    response.sendFile(path.resolve(__dirname, "./public/index.html"));
  });
  
  resolve();
  
});

