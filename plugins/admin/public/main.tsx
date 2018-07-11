import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as redux from "redux";
import App from "./components/App";
import "./main.less";

const initial_state: iReduxState = {
  route: "/"
};

export const render = () => ReactDOM.render(
  <App/>,
  document.getElementById("admin-app")
);

export const store = redux.createStore((state: any = initial_state, action) => {
  return _.assign({}, state);
});

export interface iReduxState {
  route: string
}

store.subscribe(render);
render();