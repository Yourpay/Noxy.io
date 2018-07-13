import * as React from "react";
import TextInput from "../ui/input/TextInput/TextInput";

export default class Login extends React.Component<any, any> {
  constructor(props) {
    super(props);
  }
  
  render() {
    return (
      <div>
        <TextInput id="email" label="Email" vertical={true}/>
        <TextInput id="password" label="Password" vertical={true}/>
      </div>
    );
  }
}
