import * as Promise from "bluebird";
import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as redux from "redux";
import App from "./components/App";
import {iUserObject} from "./interfaces/iObject";
import "./main.less";

const init: iReduxState = {
  time:    Date.now(),
  user:    null,
  loading: {},
  object:  {},
  url:     {
    api: window.location.protocol + "//api." + _.tail(window.location.hostname.split(".")).join(".")
  }
};

export const render = () => ReactDOM.render(<App/>, document.getElementById("admin-app"));
export const store = redux.createStore((current_state: iReduxState, action: iReduxAction) => {
  if (action.type && _.isString(action.type) && _.get(this, [action.type])) { return _.invoke(this, action.type, init, action); }
  return _.assign({}, merge(current_state, action.value));
});

store.subscribe(render);
store.dispatch({type: null, value: init});
render();

function merge(state, object) {
  return _.transform(object, (result, value, key) => {
    if (_.isPlainObject(value)) { return _.set(result, key, merge(result[key], value)); }
    return _.set(result, key, value);
  }, _.assign({}, state));
}

interface iReduxAction {
  type: string
  value: any
  error?: boolean
}

interface iReduxState {
  time: number
  loading: {[key: string]: Promise<any>}
  object: {[key: string]: any}
  url: {
    api: string
  }
  user: iUserObject
}