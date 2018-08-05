export interface iAPIResponse {
  code?: number;
  type?: string;
  message?: string;
  content?: any;
  time_finished?: number;
  time_elapsed?: string;
}