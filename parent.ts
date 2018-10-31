import * as cluster from "cluster";
import * as express from "express";
import * as http from "http";
import * as os from "os";

const cores = os.cpus().length;

if (cluster.isMaster) {
  if (cores === 1) {
  
  }
  else {
    for (let i = 1; i < cores; i++) {
      cluster.fork();
    }
  }
}
else {
  const application = express();
  
  application.get("/", function (req, res) {
    res.send("hello world from " + process.pid);
  });
  
  http.createServer(application).listen(80);
  
  console.log("hello from", process.pid);
}
