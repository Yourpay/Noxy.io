import * as React from "react";
import {routes, store} from "../main";
import Home from "./routes/Home/Home";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      React.createElement(routes[store.getState().route])
    );
  }
  
}