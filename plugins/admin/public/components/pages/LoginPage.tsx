import * as React from "react";
import Login from "../fragments/Login";

export default class LoginPage extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    console.log("Login being rendered");
    return (
      <div>
        <h2>Login</h2>
        <Login/>
      </div>
    );
  }
}
