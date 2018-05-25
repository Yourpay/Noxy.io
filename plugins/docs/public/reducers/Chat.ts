import * as _ from "lodash";

export namespace ReducerChat {
  
  export function change(state, action) {
    return _.assign({}, state, {route: action.value});
  }
  
}
