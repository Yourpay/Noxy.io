import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as redux from "redux";
import App from "./components/App";
import "./main.less";

const initial_state: iReduxState = {
  api:           window.location.protocol + "//api." + _.tail(window.location.hostname.split(".")).join("."),
  authenticated: false,
  resource:      {}
};

const reducers_ctx = require.context("./reducers", true, /\.ts$/);

export const reducers = _.transform(reducers_ctx.keys(), (result, key) => _.merge(result, {[reducers_ctx(key).reducer]: _.omit(reducers_ctx(key), ["reducer"])}), {});
export const render = () => ReactDOM.render(<App/>, document.getElementById("admin-app"));
export const store = redux.createStore((state: any = initial_state, action: iReduxAction) => _.assign({}, state, _.invoke(reducers, [action.reducer, action.type], action.value) || {}));

store.subscribe(render);
render();

export interface iReduxAction {
  type: string
  value: any
  reducer: string
}

export interface iReduxState {
  api: string
  authenticated: boolean
  resource: {[key: string]: {[key: string]: any}}
}

export interface iAPIResponse {
  code?: number;
  type?: string;
  message?: string;
  content?: any;
  time_finished?: number;
  time_elapsed?: string;
}