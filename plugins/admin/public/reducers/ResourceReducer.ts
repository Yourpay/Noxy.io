export const reducer = "resource";

export function update(value, state?) {
  return {resource: value};
}

export function list(value, state?) {
  return {resource: {list: value}};
}