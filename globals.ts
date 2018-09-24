import * as _ from "lodash";
import {ePromisePipeStagesInit} from "./interfaces/iPromisePipe";
import * as PromisePipe from "./modules/PromisePipe";
import * as environmentals from "./env.json";

export const init_pipe = PromisePipe(ePromisePipeStagesInit);
export const env = _.merge(environmentals, {mode: process.env.NODE_ENV || environmentals.mode});
export const base_dir = __dirname;