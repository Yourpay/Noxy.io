import * as React from "react";
import {BrowserRouter as Router, Link, Route} from "react-router-dom";
import About from "./About";
import Home from "./Home";
import Topics from "./Topics";

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <Router>
        <div>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/topics">Topics</Link>
            </li>
          </ul>
      
          <hr/>
      
          <Route exact path="/" component={Home}/>
          <Route path="/about" component={About}/>
          <Route path="/topics" component={Topics}/>
        </div>
      </Router>
    );
  }
}
