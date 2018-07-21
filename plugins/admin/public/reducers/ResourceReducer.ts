import * as _ from "lodash";

export const reducer = "resource";

export function update(value, state?) {
  return _.assign({}, state, {resource: value});
}

export function list(value, state?) {
  return _.assign({}, state, {list: {resource: value}});
}