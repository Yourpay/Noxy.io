import * as _ from "lodash";
import * as environmentals from "./env.json";
import {ePromisePipeStagesInit} from "./interfaces/iPromisePipe";
import * as PromisePipe from "./modules/PromisePipe";

export const init_pipe = PromisePipe(ePromisePipeStagesInit);
export const env = _.merge(environmentals, {mode: process.env.NODE_ENV || environmentals.mode});
export const base_dir = __dirname;