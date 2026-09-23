export interface PaginatedResponse<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface ApiMessageResponse {
  message: string
}