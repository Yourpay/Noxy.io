import * as React from "react";
import {Route, Switch} from "react-router";
import {Link} from "react-router-dom";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import ResourcePage from "../pages/ResourcePage";

export default class Frame extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div id="frame">
        <div id="navbar">
          <Link to="/">Home</Link>
          <Link to="/resource">Resources</Link>
        </div>
        <Switch>
          <Route exact path="/" component={HomePage}/>
          <Route path="/resource" component={ResourcePage}/>
          <Route component={NotFoundPage}/>
        </Switch>
      </div>
    );
  }
}
