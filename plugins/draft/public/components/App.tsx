import * as React from "react";
import {BrowserRouter as Router} from "react-router-dom";
import Frame from "./fragments/Frame/Frame";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return <Router><Frame/></Router>;
  }
}
