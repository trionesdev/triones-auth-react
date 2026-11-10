import {StrictMode, useState} from 'react'
import {act, render, renderHook, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {Authentication, AuthenticationProvider, useAuthentication} from '@trionesdev/auth-react'
import {deferred} from './utils'

type Actor = { username: string }

const Profile = () => {
  const {actor, setActor, signOut} = useAuthentication<Actor>()
  return <div>
    <span>当前用户：{actor?.username}</span>
    <button onClick={() => setActor?.({username: 'manual'})}>设置用户</button>
    <button onClick={() => signOut?.()}>退出</button>
  </div>
}

describe('AuthenticationProvider / Authentication', () => {
  it('actorRequest 返回用户后渲染受保护内容', async () => {
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider<Actor> actorRequest={() => Promise.resolve({username: 'admin'})}
                                     onUnAuthenticated={onUnAuthenticated}>
        <Authentication><Profile/></Authentication>
      </AuthenticationProvider>
    )
    expect(await screen.findByText('当前用户：admin')).toBeInTheDocument()
    expect(onUnAuthenticated).not.toHaveBeenCalled()
  })

  it('加载期间不渲染内容，也不触发 onUnAuthenticated', async () => {
    const request = deferred<Actor | null>()
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider<Actor> actorRequest={() => request.promise} onUnAuthenticated={onUnAuthenticated}>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    await act(async () => {})
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(onUnAuthenticated).not.toHaveBeenCalled()

    await act(async () => request.resolve({username: 'admin'}))
    expect(screen.getByText('protected')).toBeInTheDocument()
  })

  it.each([
    ['返回 null', () => Promise.resolve(null)],
    ['请求失败', () => Promise.reject(new Error('401'))],
    ['同步抛出异常', () => { throw new Error('boom') }],
  ])('%s 时视为未认证并触发 onUnAuthenticated', async (_, actorRequest) => {
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider actorRequest={actorRequest as () => Promise<Actor | null>}
                              onUnAuthenticated={onUnAuthenticated}>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    await waitFor(() => expect(onUnAuthenticated).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('未配置 actorRequest 时直接视为未认证', () => {
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider onUnAuthenticated={onUnAuthenticated}>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    expect(onUnAuthenticated).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('嵌套的 Authentication 只触发一次 onUnAuthenticated', async () => {
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider actorRequest={() => Promise.resolve(null)} onUnAuthenticated={onUnAuthenticated}>
        <Authentication>
          <Authentication><div>protected</div></Authentication>
        </Authentication>
        <Authentication><div>other</div></Authentication>
      </AuthenticationProvider>
    )
    await waitFor(() => expect(onUnAuthenticated).toHaveBeenCalled())
    await act(async () => {})
    expect(onUnAuthenticated).toHaveBeenCalledTimes(1)
  })

  it('之后新挂载的 Authentication 仍会再次触发 onUnAuthenticated', async () => {
    const onUnAuthenticated = vi.fn()
    const Toggle = () => {
      const [show, setShow] = useState(false)
      return <>
        <button onClick={() => setShow(true)}>进入受保护页</button>
        {show && <Authentication><div>protected</div></Authentication>}
      </>
    }
    render(
      <AuthenticationProvider actorRequest={() => Promise.resolve(null)} onUnAuthenticated={onUnAuthenticated}>
        <Authentication><div>first</div></Authentication>
        <Toggle/>
      </AuthenticationProvider>
    )
    await waitFor(() => expect(onUnAuthenticated).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('进入受保护页'))
    expect(onUnAuthenticated).toHaveBeenCalledTimes(2)
  })

  it('signOut 只触发 onSignOut，不触发 onUnAuthenticated', async () => {
    const onSignOut = vi.fn()
    const onUnAuthenticated = vi.fn()
    render(
      <AuthenticationProvider<Actor> actorRequest={() => Promise.resolve({username: 'admin'})}
                                     onSignOut={onSignOut} onUnAuthenticated={onUnAuthenticated}>
        <Profile/>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    expect(await screen.findByText('protected')).toBeInTheDocument()

    await userEvent.click(screen.getByText('退出'))
    expect(onSignOut).toHaveBeenCalledTimes(1)
    expect(onUnAuthenticated).not.toHaveBeenCalled()
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
    expect(screen.getByText('当前用户：')).toBeInTheDocument()
  })

  it('setActor 立即生效，并丢弃仍在进行中的请求结果', async () => {
    const request = deferred<Actor | null>()
    render(
      <AuthenticationProvider<Actor> actorRequest={() => request.promise}>
        <Profile/>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    await userEvent.click(screen.getByText('设置用户'))
    expect(screen.getByText('当前用户：manual')).toBeInTheDocument()
    expect(screen.getByText('protected')).toBeInTheDocument()

    await act(async () => request.resolve(null))
    expect(screen.getByText('当前用户：manual')).toBeInTheDocument()
    expect(screen.getByText('protected')).toBeInTheDocument()
  })

  it('StrictMode 下只请求一次', async () => {
    const actorRequest = vi.fn(() => Promise.resolve({username: 'admin'}))
    render(
      <StrictMode>
        <AuthenticationProvider actorRequest={actorRequest}>
          <Authentication><div>protected</div></Authentication>
        </AuthenticationProvider>
      </StrictMode>
    )
    expect(await screen.findByText('protected')).toBeInTheDocument()
    expect(actorRequest).toHaveBeenCalledTimes(1)
  })

  it('父组件重渲染时，内联的 actorRequest 不会重复请求', async () => {
    const spy = vi.fn(() => Promise.resolve({username: 'admin'}))
    const Parent = () => {
      const [count, setCount] = useState(0)
      return <AuthenticationProvider actorRequest={() => spy()} onUnAuthenticated={() => {}}>
        <button onClick={() => setCount(count + 1)}>rerender {count}</button>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    }
    render(<Parent/>)
    expect(await screen.findByText('protected')).toBeInTheDocument()
    await userEvent.click(screen.getByText('rerender 0'))
    await userEvent.click(screen.getByText('rerender 1'))
    expect(screen.getByText('protected')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('父组件重渲染时调用的是最新的 onUnAuthenticated', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const {rerender} = render(
      <AuthenticationProvider actorRequest={() => deferred<null>().promise} onUnAuthenticated={first}>
        <Profile/>
      </AuthenticationProvider>
    )
    rerender(
      <AuthenticationProvider actorRequest={() => deferred<null>().promise} onUnAuthenticated={second}>
        <Profile/>
        <Authentication><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    await userEvent.click(screen.getByText('设置用户'))
    await userEvent.click(screen.getByText('退出'))
    // signOut 后新挂载的组件触发回调
    rerender(
      <AuthenticationProvider actorRequest={() => deferred<null>().promise} onUnAuthenticated={second}>
        <Authentication key="new"><div>protected</div></Authentication>
      </AuthenticationProvider>
    )
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('在 AuthenticationProvider 之外使用 useAuthentication 会抛错', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuthentication())).toThrow('useAuthentication 必须在 AuthenticationProvider 内使用')
  })
})
