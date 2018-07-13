import * as React from "react";

export default class TextInput extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <label htmlFor={this.props.id}>{this.props.label}</label>
        <input id={this.props.id} type="text"/>
      </div>
    );
  }
}
