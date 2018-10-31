export interface iProcessSettings {
  exec: string
  args: string[]
  execArgv: string[]
  gid: number
  inspectPort: number | (() => number)
  silent: boolean
  stdio: any[]
  uid: number
}
