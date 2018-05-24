import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as redux from "redux";
import App from "./components/App";
import "./main.less";

import * as ChatReducer from "./reducers/Chat";

const initial_state: IState = {
  route:   "Home",
  counter: 0
};

const routes_ctx = require.context("./components/routes", true, /\.tsx$/);
export const routes: { [key: string]: IRouteComponent } = _.transform(routes_ctx.keys(), (r, v) => _.set(r, routes_ctx(v).default.name, routes_ctx(v).default), {});
const reducers_ctx = require.context("./reducers", true, /\.ts$/);
export const reducers: { [key: string]: React.ComponentClass } = _.transform(reducers_ctx.keys(), (r, v) => _.merge(r, _.transform(reducers_ctx(v), (r, v, k) => _.set(r, k, v), {})), {});

export const render = () => ReactDOM.render(
  <App/>,
  document.getElementById("chat-app")
);

export const store = redux.createStore((state: any = initial_state, action: IAction) => {
  return _.invoke(reducers, [`Reducer${_.upperFirst(action.reducer)}`, action.type], state, action) || _.assign({}, state);
});

export interface IRouteComponent extends React.ComponentClass {
  change: (state: IState, action: IAction) => IState
}

export interface IAction {
  reducer: string
  type: string
  value: any
}

export interface IState {
  route: string
  counter: number
  chat?: iChat
}

export interface iChat {
  current_chat: string
  contacts: { [key: string]: iUser }
  chatrooms: {
    user_rights: object
    participants: object
  }
}

export interface iParticipant {
  user: iUser
  time_joined: number
  roles: iRole[]
}

export interface iUser {

}

export interface iRole {

}

store.subscribe(render);
render();