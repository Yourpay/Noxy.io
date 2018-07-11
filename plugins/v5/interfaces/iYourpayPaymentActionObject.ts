export default interface iYourpayPaymentActionObject {
  ActionID: number
  PaymentID: number
  req_timestamp: number
  actual_captures: number
  financial_date: number
  payment_institute: number
  short_id: string
  uniqueid: string
  capture_state: string
  capture_reason: string
  dateid: number
  amount: number
  captured: number
  handlingtype: string
  institute: number
  verified_payon_data: number
  reprocess: number
  retries: number
  last_retry: number
  last_updated: Date
}
