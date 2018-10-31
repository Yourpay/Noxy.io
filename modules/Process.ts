import * as cluster from "cluster";

class Process {
  
  private process: cluster.Worker;
  
  constructor(setup: cluster.ClusterSettings) {
    cluster.setupMaster(_.merge({}, setup));
    this.process = cluster.fork();
  }
  
  
  
}
