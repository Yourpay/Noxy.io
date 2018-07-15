import * as React from "react";

export default class TextInput extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <label htmlFor={this.props.id}>{this.props.label}</label>
        <input type={this.props.type || "text"} id={this.props.id} value={this.props.value} onChange={this.props.onChange}/>
      </div>
    );
  }
}
