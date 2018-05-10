import * as SocketIO from "socket.io";
import * as https from "https";
import * as http from "http";
import WebSocket from "../classes/WebSocket";

export namespace WebSocketService {
  
  let __websocket: SocketIO.Server;
  let __server: http.Server | https.Server;
  
  export function register(server: http.Server | https.Server): http.Server | https.Server {
    if (__websocket) { return __server; }
    __websocket = SocketIO(__server = server);
    __websocket.on("connection", (socket: SocketIO.Socket) => {
      const ws = new WebSocket(socket);
      ws.once("authorization")
      .then(res => { })
      .catch(err => { });
    });
    
  }
  
}
