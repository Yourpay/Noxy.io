import * as _ from "lodash";

export namespace ReducerRoute {
  
  export function change(state, action) {
    return _.assign({}, state, {route: action.value});
  }
  
}