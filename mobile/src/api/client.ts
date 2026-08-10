import axios from 'axios'

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5288'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})
