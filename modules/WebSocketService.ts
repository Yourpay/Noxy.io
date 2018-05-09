import * as bodyParser from "body-parser";
import * as SocketIO from "socket.io";
import * as Promise from "bluebird";
import * as jwt from "jsonwebtoken";
import * as env from "../env.json";
import * as express from "express";
import * as https from "https";
import * as http from "http";
import * as _ from "lodash";
import * as fs from "fs";

import {roles} from "../app";
import ServerError from "../classes/ServerError";
import RoleRoute from "../objects/RoleRoute";
import RoleUser from "../objects/RoleUser";
import Element from "../classes/Element";
import Route from "../objects/Route";
import Role from "../objects/Role";
import User from "../objects/User";
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
