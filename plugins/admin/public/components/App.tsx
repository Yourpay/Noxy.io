import * as React from "react";
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import PrivateRoute from "./PrivateRoute";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <Router>
        <div>
          <PrivateRoute exact path="/" component={Home}/>
          <Route exact path="/login" component={Login}/>
        </div>
      </Router>
    );
  }
}
