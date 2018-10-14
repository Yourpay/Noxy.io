import * as _ from "lodash";
import {iRoutineFn, iRoutineService} from "../interfaces/iRoutine";

const Service: iRoutineFn = Default;

function Default<T>() {
}

const exported: iRoutineService = _.assign(
  Service,
  {}
);

export = exported;
