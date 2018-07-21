import * as React from "react";
import {Route, Switch} from "react-router";
import {Link} from "react-router-dom";
import HomePage from "../../pages/HomePage";
import NotFoundPage from "../../pages/NotFoundPage";
import ResourceListPage from "../../pages/ResourceListPage";

export default class Frame extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div id="frame">
        <div id="navbar">
          <div className="navbar-toggle"/>
          <Link className="navbar-link" to="/">Home</Link>
          <Link className="navbar-link" to="/resource">Resources</Link>
        </div>
        <div id="content">
          <Switch>
            <Route exact path="/" component={HomePage}/>
            <Route path="/resource" component={ResourceListPage}/>
            <Route component={NotFoundPage}/>
          </Switch>
        </div>
      </div>
    );
  }
}
