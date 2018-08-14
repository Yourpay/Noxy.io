import axios from "axios";
import * as Promise from "bluebird";
import * as _ from "lodash";
import * as React from "react";
import {store} from "../../../main";
import TextInput from "../../ui/input/TextInput/TextInput";

export default class Login extends React.Component<any, any> {
  
  private static readonly url = "/user/login";
  
  constructor(props) {
    super(props);
    this.state = {email: "", password: "", authenticating: false};
    this.handleChange = this.handleChange.bind(this);
    this.login = this.login.bind(this);
  }
  
  componentDidMount() {
    if (window.localStorage.getItem("jwt")) {
      store.dispatch({
        type:  null,
        value: {
          loading: {
            [Login.url]: Promise.resolve(axios({
              method:  "POST",
              baseURL: store.getState().url.api,
              url:     Login.url,
              headers: {
                "Authorization": window.localStorage.getItem("jwt")
              }
            })
            .then(res => store.dispatch({
              type:  "login-automatic",
              value: {user: _.invoke(JSON, "parse", atob(res.data.content.split(".")[1]))}
            })))
          }
        }
      });
    }
  }
  
  render() {
    return (
      <form onSubmit={this.login}>
        <TextInput type="text" id="email" label="Email or username" value={this.state.email} onChange={this.handleChange}/>
        <TextInput type="password" id="password" label="Password" value={this.state.password} onChange={this.handleChange}/>
        <input type="submit" value="Submit"/>
      </form>
    );
  }
  
  handleChange(event) {
    this.setState({[event.target.id]: event.target.value});
  }
  
  login(event) {
    event.preventDefault();
    store.dispatch({
      type:  null,
      value: {
        loading: {
          [Login.url]: Promise.resolve(axios({
            method:  "POST",
            baseURL: store.getState().url.api,
            url:     Login.url,
            data:    {
              email:    this.state.email,
              password: this.state.password
            }
          })
          .then(res => store.dispatch({
            type:  "login-manual",
            value: {user: _.invoke(JSON, "parse", atob(res.data.content.split(".")[1]))}
          })))
        }
      }
    });
  }
  
}