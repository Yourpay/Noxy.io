import * as React from "react";
import {BrowserRouter as Router} from "react-router-dom";
import {store} from "../main";
import Frame from "./fragments/Frame/Frame";
import Login from "./fragments/Login/Login";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    if (!store.getState().user) { return <Router><Login/></Router>; }
    return <Router><Frame/></Router>;
  }
}
