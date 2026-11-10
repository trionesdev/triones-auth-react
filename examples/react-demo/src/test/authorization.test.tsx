import {ReactNode, useState} from 'react'
import {act, render, renderHook, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {
  AuthenticationProvider,
  Authorization,
  AuthorizationProvider,
  useAuthentication,
  useAuthorization,
} from '@trionesdev/auth-react'
import {deferred} from './utils'

type AuthorizationResponse = { master?: boolean; permissions?: unknown[] }
type ProviderProps = Omit<Parameters<typeof AuthorizationProvider>[0], 'children'>

const PERMISSIONS = ['security', 'create', 'update']

/** 已登录用户 + 权限 Provider */
const setup = (ui: ReactNode, props: ProviderProps = {}, actor: unknown = {username: 'admin'}) => render(
  <AuthenticationProvider actorRequest={() => Promise.resolve(actor)}>
    <AuthorizationProvider authorizationRequest={() => Promise.resolve({permissions: PERMISSIONS})} {...props}>
      {ui}
    </AuthorizationProvider>
  </AuthenticationProvider>
)

const wrapper = (props: ProviderProps = {}) => ({children}: { children: ReactNode }) => (
  <AuthenticationProvider actorRequest={() => Promise.resolve({username: 'admin'})}>
    <AuthorizationProvider authorizationRequest={() => Promise.resolve({permissions: PERMISSIONS})} {...props}>
      {children}
    </AuthorizationProvider>
  </AuthenticationProvider>
)

describe('Authorization 权限判断', () => {
  it.each([
    ['单个权限', 'create', undefined, true],
    ['单个缺失权限', 'delete', undefined, false],
    ['and 全部拥有', ['create', 'update'], 'and', true],
    ['and 缺少一个', ['create', 'delete'], 'and', false],
    ['or 拥有其一', ['create', 'delete'], 'or', true],
    ['or 全部缺失', ['delete', 'remove'], 'or', false],
  ] as const)('%s', async (_, value, mode, expected) => {
    setup(<Authorization value={value as string | string[]} mode={mode}>
      <button>action</button>
    </Authorization>)
    await act(async () => {})
    if (expected) {
      expect(screen.getByText('action')).toBeInTheDocument()
    } else {
      expect(screen.queryByText('action')).not.toBeInTheDocument()
    }
  })

  it('master 用户拥有全部权限', async () => {
    setup(<Authorization value="anything"><div>ok</div></Authorization>, {
      authorizationRequest: () => Promise.resolve({master: true}),
    })
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('支持对象类型的权限（深比较）', async () => {
    setup(<>
      <Authorization value={[{resource: 'user', action: 'read'}] as unknown as string[]}><div>read</div></Authorization>
      <Authorization value={[{resource: 'user', action: 'write'}] as unknown as string[]}><div>write</div></Authorization>
    </>, {
      authorizationRequest: () => Promise.resolve({permissions: [{resource: 'user', action: 'read'}]}),
    })
    expect(await screen.findByText('read')).toBeInTheDocument()
    expect(screen.queryByText('write')).not.toBeInTheDocument()
  })

  it('permissionTransform 会转换需要的权限', async () => {
    setup(<Authorization value="user:read"><div>ok</div></Authorization>, {
      authorizationRequest: () => Promise.resolve({permissions: [{resource: 'user', action: 'read'}]}),
      permissionTransform: (value: string) => {
        const [resource, action] = value.split(':')
        return {resource, action}
      },
    })
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('customAuthenticate 优先于默认鉴权', async () => {
    const customAuthenticate = vi.fn((required: string, permissions: string[]) =>
      permissions.some(p => p.startsWith(required)))
    setup(<Authorization value="sec"><div>ok</div></Authorization>, {customAuthenticate})
    expect(await screen.findByText('ok')).toBeInTheDocument()
    expect(customAuthenticate).toHaveBeenCalledWith('sec', PERMISSIONS, 'and')
  })

  it('组件级 authenticate 接收当前权限列表', async () => {
    const authenticate = vi.fn((permissions: unknown[]) => permissions.length === 3)
    setup(<Authorization authenticate={authenticate}><div>ok</div></Authorization>)
    expect(await screen.findByText('ok')).toBeInTheDocument()
    expect(authenticate).toHaveBeenLastCalledWith(PERMISSIONS)
  })
})

describe('Authorization 未授权处理', () => {
  it('优先渲染组件自身的 unauthorized，其次使用 Provider 的', async () => {
    setup(<>
      <Authorization value="delete" unauthorized={<div>组件未授权</div>}><div>a</div></Authorization>
      <Authorization value="delete"><div>b</div></Authorization>
    </>, {unauthorized: <div>全局未授权</div>})
    expect(await screen.findByText('组件未授权')).toBeInTheDocument()
    expect(screen.getByText('全局未授权')).toBeInTheDocument()
  })

  it('组件的 onUnauthorized 优先，未提供时回退到 Provider 的', async () => {
    const local = vi.fn()
    const global = vi.fn()
    setup(<>
      <Authorization value="delete" onUnauthorized={local}><div>a</div></Authorization>
      <Authorization value="remove"><div>b</div></Authorization>
      <Authorization value="create"><div>c</div></Authorization>
    </>, {onUnauthorized: global})
    await waitFor(() => expect(local).toHaveBeenCalledTimes(1))
    expect(global).toHaveBeenCalledTimes(1)
  })

  it('父组件重渲染时，内联 onUnauthorized 不会重复触发', async () => {
    const spy = vi.fn()
    const Page = () => {
      const [count, setCount] = useState(0)
      return <>
        <button onClick={() => setCount(count + 1)}>rerender {count}</button>
        <Authorization value="delete" onUnauthorized={() => spy()}><div>a</div></Authorization>
      </>
    }
    setup(<Page/>)
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('rerender 0'))
    await userEvent.click(screen.getByText('rerender 1'))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('权限加载期间不渲染内容，也不触发 onUnauthorized', async () => {
    const request = deferred<AuthorizationResponse>()
    const onUnauthorized = vi.fn()
    setup(<Authorization value="create" unauthorized={<div>未授权</div>} onUnauthorized={onUnauthorized}>
      <div>ok</div>
    </Authorization>, {authorizationRequest: () => request.promise})
    await act(async () => {})
    expect(screen.queryByText('ok')).not.toBeInTheDocument()
    expect(screen.queryByText('未授权')).not.toBeInTheDocument()
    expect(onUnauthorized).not.toHaveBeenCalled()

    await act(async () => request.resolve({permissions: ['create']}))
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('权限请求失败时按无权限处理', async () => {
    setup(<Authorization value="create" unauthorized={<div>未授权</div>}><div>ok</div></Authorization>, {
      authorizationRequest: () => Promise.reject(new Error('500')),
    })
    expect(await screen.findByText('未授权')).toBeInTheDocument()
  })
})

describe('AuthorizationProvider 与认证会话', () => {
  it('未登录时不请求权限，也不渲染内容', async () => {
    const authorizationRequest = vi.fn(() => Promise.resolve({permissions: PERMISSIONS}))
    setup(<Authorization value="create"><div>ok</div></Authorization>, {authorizationRequest}, null)
    await act(async () => {})
    expect(authorizationRequest).not.toHaveBeenCalled()
    expect(screen.queryByText('ok')).not.toBeInTheDocument()
  })

  it('未配置 authorizationRequest 时同步完成且没有任何权限', async () => {
    setup(<Authorization value="create" unauthorized={<div>未授权</div>}><div>ok</div></Authorization>, {
      authorizationRequest: undefined,
    })
    expect(await screen.findByText('未授权')).toBeInTheDocument()
  })

  it('切换用户时重新请求权限，且不会闪现上一用户的权限', async () => {
    const requests = [
      deferred<AuthorizationResponse>(),
      deferred<AuthorizationResponse>(),
    ]
    let index = 0
    const SwitchUser = () => {
      const {setActor} = useAuthentication()
      return <button onClick={() => setActor?.({username: 'guest'})}>切换用户</button>
    }
    setup(<>
      <SwitchUser/>
      <Authorization value="create"><div>create</div></Authorization>
    </>, {authorizationRequest: () => requests[index++].promise})

    await act(async () => {})
    await act(async () => requests[0].resolve({permissions: ['create']}))
    expect(screen.getByText('create')).toBeInTheDocument()

    await userEvent.click(screen.getByText('切换用户'))
    expect(screen.queryByText('create')).not.toBeInTheDocument()

    await act(async () => requests[1].resolve({permissions: []}))
    expect(screen.queryByText('create')).not.toBeInTheDocument()
    expect(index).toBe(2)
  })

  it('退出登录后清空权限', async () => {
    const SignOut = () => {
      const {signOut} = useAuthentication()
      return <button onClick={() => signOut?.()}>退出</button>
    }
    setup(<>
      <SignOut/>
      <Authorization value="create"><div>create</div></Authorization>
    </>)
    expect(await screen.findByText('create')).toBeInTheDocument()
    await userEvent.click(screen.getByText('退出'))
    expect(screen.queryByText('create')).not.toBeInTheDocument()
  })

  it('父组件重渲染时，内联的 authorizationRequest 不会重复请求', async () => {
    const spy = vi.fn(() => Promise.resolve({permissions: PERMISSIONS}))
    const Parent = () => {
      const [count, setCount] = useState(0)
      return <AuthenticationProvider actorRequest={() => Promise.resolve({username: 'admin'})}>
        <AuthorizationProvider authorizationRequest={() => spy()}>
          <button onClick={() => setCount(count + 1)}>rerender {count}</button>
          <Authorization value="create"><div>create</div></Authorization>
        </AuthorizationProvider>
      </AuthenticationProvider>
    }
    render(<Parent/>)
    expect(await screen.findByText('create')).toBeInTheDocument()
    await userEvent.click(screen.getByText('rerender 0'))
    expect(screen.getByText('create')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('useAuthorization', () => {
  it('hasAll / hasAny', async () => {
    const {result} = renderHook(() => useAuthorization(), {wrapper: wrapper()})
    await waitFor(() => expect(result.current.authorizationSynced).toBe(true))
    expect(result.current.permissions).toEqual(PERMISSIONS)
    expect(result.current.hasAll(['create', 'update'])).toBe(true)
    expect(result.current.hasAll(['create', 'delete'])).toBe(false)
    expect(result.current.hasAny(['create', 'delete'])).toBe(true)
    expect(result.current.hasAny(['delete'])).toBe(false)
  })

  it('setPermissions / setMaster 立即生效', async () => {
    const {result} = renderHook(() => useAuthorization(), {wrapper: wrapper()})
    await waitFor(() => expect(result.current.authorizationSynced).toBe(true))

    act(() => result.current.setPermissions?.(['delete']))
    expect(result.current.hasAll('delete')).toBe(true)
    expect(result.current.hasAll('create')).toBe(false)

    act(() => result.current.setMaster?.(true))
    expect(result.current.master).toBe(true)
    expect(result.current.hasAll('anything')).toBe(true)
  })

  it('没有 Provider 时所有判断都返回 false', () => {
    const {result} = renderHook(() => useAuthorization())
    expect(result.current.hasAll('create')).toBe(false)
    expect(result.current.hasAny('create')).toBe(false)
  })
})
