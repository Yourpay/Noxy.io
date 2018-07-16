import * as React from "react";
import {BrowserRouter as Router} from "react-router-dom";
import {store} from "../main";
import Frame from "./fragments/Frame";
import Login from "./fragments/Login";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <Router>
        <div>
          {
            store.getState().authenticated
            ? <Frame/>
            : <Login/>
          }
        </div>
      </Router>
    );
  }
}
