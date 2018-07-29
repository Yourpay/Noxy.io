import axios from "axios";
import * as React from "react";
import {store} from "../../../main";
import TextInput from "../../ui/input/TextInput/TextInput";

export default class Login extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {username: "", password: "", authenticating: false};
    this.change = this.change.bind(this);
    this.login = this.login.bind(this);
  }
  
  componentDidMount() {
    if (window.localStorage.jwt) {
      this.setState({authenticating: true});
      axios({
        method:  "POST",
        baseURL: store.getState().api,
        url:     "/user/login",
        headers: {
          "Authorization": window.localStorage.jwt
        }
      })
      .then(res => store.dispatch({reducer: "user", type: "login", value: res.data.content}));
    }
  }
  
  render() {
    return (
      <form onSubmit={this.login}>
        <TextInput type="text" id="email" label="Email or username" vertical={true} value={this.state.email} onChange={this.change}/>
        <TextInput type="password" id="password" label="Password" vertical={true} value={this.state.password} onChange={this.change}/>
        <input type="submit" value="Submit"/>
      </form>
    );
  }
  
  change(event) {
    this.setState({[event.target.id]: event.target.value});
  }
  
  login(event) {
    event.preventDefault();
    axios.post(store.getState().api + "/user/login", {
      email:    this.state.email,
      password: this.state.password
    })
    .then(res => store.dispatch({reducer: "user", type: "login", value: res.data.content}));
  }
  
}