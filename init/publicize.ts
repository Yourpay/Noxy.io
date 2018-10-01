import * as Promise from "bluebird";
import * as _ from "lodash";
import {env, init_pipe} from "../globals";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as PromisePipe from "../modules/PromisePipe";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";

export enum ePromisePipeStagesInitPublicize {
  SETUP   = 0,
  PUBLISH = 1,
  LISTEN  = 2,
  PLUGIN  = 3
}

export const publicize_pipe = PromisePipe(ePromisePipeStagesInitPublicize);

publicize_pipe.add("SETUP", () => {
  const Application = require("../modules/Application");
  Application.addParam(env.subdomains.api, "id", (request, response, next, id) => (request.query.id = id) && next());
  return Promise.map(_.values(Resource.list), v => Application.addResource(v));
});

publicize_pipe.add(ePromisePipeStagesInitPublicize.LISTEN, () => require("../modules/Application").publicize() ? Promise.resolve() : Promise.reject(Response.error(500, "publicize")));

init_pipe.add(ePromisePipeStagesInit.PUBLICIZE, () => publicize_pipe.resolve());
