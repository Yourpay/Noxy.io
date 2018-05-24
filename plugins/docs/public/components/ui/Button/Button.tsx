import * as React from "react";


export default class Button extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    
    return (
      <button onClick={() => this.props.onClick()}>{this.props.text}</button>
    );
  }
  
}