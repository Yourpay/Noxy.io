import * as React from "react";

export default class Button extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <button onClick={() => this.props.callback()}>{this.props.label}</button>
    );
  }
}

interface iButtonProps {
  label: string
  callback: () => void
}