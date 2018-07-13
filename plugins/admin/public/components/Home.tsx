import * as React from "react";

export default class Home extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  componentWillReceiveProps(props) {
    console.log("Home received props", props);
  }
  
  componentDidMount() {
    console.log("Home did mount");
    
  }
  
  componentWillMount() {
    console.log("Home will mount");
  }
  
  render() {
    return (
      <div>
        <h2>Home</h2>
      </div>
    );
  }
}
