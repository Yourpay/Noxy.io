import * as React from "react";
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Login from "./Login";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentWillReceiveProps(props) {
    console.log("App received props", props);
  }
  
  render() {
    return (
      <Router>
        <div>
          <Route exact path="/" component={Home}/>
          <Route exact path="/login" component={Login}/>
        </div>
      </Router>
    );
  }
}
