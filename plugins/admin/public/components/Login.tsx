import * as React from "react";

export default class Home extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    console.log("Login being rendered");
    return (
      <div>
        <h2>Login</h2>
      </div>
    );
  }
}
