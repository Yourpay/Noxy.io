import {init_chain} from "../../../app";

console.log("test init");

init_chain.addPromise("route", resolve => {
  
  const user = "admin";
  const pass = "x1E0TGr=&S_iLJ^O";
  const host = "192.168.0.1";
  
  resolve();
  
});

