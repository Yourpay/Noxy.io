import * as _ from "lodash";
import * as SocketIO from "socket.io";
import * as Promise from "bluebird";

export default class WebSocket {
  
  private __socket: SocketIO.Socket;
  
  private static __timeout: number = 10000;
  
  constructor(socket: SocketIO.Socket) {
    this.__socket = socket;
  }
  
  public on(event: string, callback: (data) => {}) {
    this.__socket.on(event, callback);
  }
  
  public emit(event: string, data: any) {
    this.__socket.emit(event, data);
  }
  
  public once(event: string, data?: any) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.__socket.removeListener(event, f) && reject(new Error("WebSocket once request has expired.")), WebSocket.__timeout);
      const f = (data) => this.__socket.removeListener(event, f) && !clearTimeout(timer) && resolve(data);
      this.__socket.on(event, f);
    });
  };
  
  
  
}

interface iSQLError {
  code: string,
  errno: number,
  sqlMessage: string,
  sqlState: string,
  index: number,
  sql: string
}