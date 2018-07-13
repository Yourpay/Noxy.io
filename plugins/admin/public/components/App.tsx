import * as React from "react";
import {BrowserRouter as Router, Route} from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./pages/LoginPage";
import PrivateRoute from "./router/PrivateRoute";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <Router>
        <div>
          <PrivateRoute exact path="/" component={HomePage}/>
          <Route exact path="/login" component={Login}/>
        </div>
      </Router>
    );
  }
}
