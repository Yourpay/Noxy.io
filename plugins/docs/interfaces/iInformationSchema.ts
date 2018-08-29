export interface iInformationSchemaTable {
  TABLE_ID?: number
  NAME?: string
  FLAG?: number
  N_COLS?: number
  SPACE?: number
  ROW_FORMAT?: string
  ZIP_PAGE_SIZE?: number
  SPACE_TYPE?: string
  INSTANT_COLS?: number
  
}

export interface iInformationSchemaColumn {
  TABLE_ID?: number
  NAME?: string
  POS?: number
  MTYPE?: number
  PRTYPE?: number
  LEN?: number
  HAS_DEFAULT?: number
  DEFAULT_VALUE?: number
}