import '@testing-library/jest-dom/vitest'
import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'

// react-router 的数据路由在导航时会 new Request({signal})，而 jsdom 的 AbortSignal
// 不被 Node 内置的 Request(undici) 接受。demo 没有 loader/action，丢弃 signal 即可。
const NativeRequest = globalThis.Request
globalThis.Request = class extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init && {...init, signal: undefined})
  }
} as typeof Request

afterEach(() => {
  cleanup()
})
