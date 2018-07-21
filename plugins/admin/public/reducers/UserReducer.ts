export const reducer = "user";

export function login(value, state?) {
  window.localStorage.jwt = value;
  return {authenticated: true, user: JSON.parse(atob(value.split(".")[1]))};
}

export function update(value, state?) {
  return value;
}