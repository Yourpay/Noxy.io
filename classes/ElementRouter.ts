import * as express from "express";
import Router from "./Router";
import Element from "./Element";
import * as env from "../env.json";
import * as jwt from "jsonwebtoken";

export default class ElementRouter extends Router {
  
  constructor(element: typeof Element) {
    super(`/${element.__type}`, 0);
    
    const auth: express.Handler = (request, response, next) => {
      jwt.verify(request.get("Authorization"), env.tokens.jwt, (err, decoded) => {
        if (err) { return response.sendStatus(401).send("Not authorized"); }
        return response.sendStatus(200).send("Not authorized");
      });
    };
    
    this.addRoute("GET", `/${this.path}`, auth, (request, response, next) => {
    
    });
  
    this.addRoute("GET", `/${this.path}/:id`, auth, (request, response, next) => {
    
    });
    
    this.addRoute("POST", `/${this.path}`, auth, (request, response, next) => {
    
    });
  
    this.addRoute("PUT", `/${this.path}/:id`, auth, (request, response, next) => {
    
    });
  
    this.addRoute("DELETE", `/${this.path}/:id`, auth, (request, response, next) => {
    
    });
    
  }
  
};

type Method = "GET" | "POST" | "PUT" | "DELETE";
