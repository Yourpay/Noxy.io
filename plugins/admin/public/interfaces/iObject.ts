export interface iObject {
  id: string
}

export interface iUserObject extends iObject {
  username: string
  email: string
  time_created: number
  time_login: number
}