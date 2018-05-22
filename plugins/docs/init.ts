import {init_chain} from "../../app";
import {HTTPService} from "../../modules/HTTPService";
import * as path from "path";

init_chain.addPromise("tables", resolve => {

});

init_chain.addPromise("route", resolve => {
  
  HTTPService.subdomain("docs").router("/").endpoint("GET", "*", (request, response) => {
    console.log("Looking up docs");
    response.sendFile(path.resolve(__dirname, "./public/index.html"));
  });
  
  resolve();
  
});

