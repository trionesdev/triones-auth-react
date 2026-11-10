import {ReactNode} from 'react'
import {act, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import {Outlet} from 'react-router'
import {RouterProvider} from 'react-router/dom'
import {AuthenticationProvider, AuthorizationProvider} from '@trionesdev/auth-react'
import {convertRoutes, createMemoryRouter, RouteObject} from '@trionesdev/react-router-auth'

const Page = ({name}: { name: string }) => <div>{name}</div>

type SetupOptions = {
  actor?: unknown
  permissions?: string[]
  onUnAuthenticated?: () => void
}

const renderRoutes = (routes: RouteObject[], path: string, options: SetupOptions = {}) => {
  const {actor = {username: 'admin'}, permissions = ['user:read'], onUnAuthenticated} = options
  const router = createMemoryRouter(routes, {initialEntries: [path]})
  const ui: ReactNode = (
    <AuthenticationProvider actorRequest={() => Promise.resolve(actor)} onUnAuthenticated={onUnAuthenticated}>
      <AuthorizationProvider authorizationRequest={() => Promise.resolve({permissions})}>
        <RouterProvider router={router}/>
      </AuthorizationProvider>
    </AuthenticationProvider>
  )
  return {router, ...render(ui)}
}

describe('convertRoutes', () => {
  it('不修改传入的 routes，可重复转换', () => {
    const path = () => '/users'
    const element = <Page name="users"/>
    const routes: RouteObject[] = [{path, element, permission: 'user:read', children: [{path: 'detail', element}]}]

    const first = convertRoutes(routes)
    const second = convertRoutes(routes)

    expect(routes[0].path).toBe(path)
    expect(routes[0].element).toBe(element)
    expect(routes[0].children![0].element).toBe(element)
    expect(first[0].path).toBe('/users')
    expect(second).toEqual(first)
  })

  it('path 支持字符串与函数', () => {
    const [a, b] = convertRoutes([{path: '/a'}, {path: () => '/b'}])
    expect(a.path).toBe('/a')
    expect(b.path).toBe('/b')
  })

  it('Component 会被转换为包裹后的 element，且不同时保留两者', () => {
    const [route] = convertRoutes([{path: '/', Component: () => <Page name="home"/>}])
    expect(route.element).toBeDefined()
    expect(route.Component).toBeUndefined()
  })

  it('没有页面的路由（如仅含 children 的布局路由）不额外包裹', () => {
    const [route] = convertRoutes([{path: '/', children: [{index: true, element: <Page name="index"/>}]}])
    expect(route.element).toBeUndefined()
    expect(route.children![0].index).toBe(true)
    expect(route.children![0].element).toBeDefined()
  })

  it('保留其它 React Router 字段', () => {
    const loader = vi.fn()
    const [route] = convertRoutes([{path: '/', id: 'home', loader, handle: {title: '首页'}, element: <div/>}])
    expect(route).toMatchObject({id: 'home', loader, handle: {title: '首页'}})
  })
})

describe('createMemoryRouter 路由守卫', () => {
  it('匿名路由无需登录', async () => {
    const onUnAuthenticated = vi.fn()
    renderRoutes([{path: '/sign-in', element: <Page name="登录页"/>, anonymous: true}], '/sign-in', {
      actor: null, onUnAuthenticated,
    })
    expect(await screen.findByText('登录页')).toBeInTheDocument()
    expect(onUnAuthenticated).not.toHaveBeenCalled()
  })

  it('默认需要登录，未登录时触发 onUnAuthenticated', async () => {
    const onUnAuthenticated = vi.fn()
    renderRoutes([{path: '/', element: <Page name="首页"/>}], '/', {actor: null, onUnAuthenticated})
    await act(async () => {})
    expect(screen.queryByText('首页')).not.toBeInTheDocument()
    expect(onUnAuthenticated).toHaveBeenCalledTimes(1)
  })

  it('登录后渲染页面（element 与 Component 均可）', async () => {
    renderRoutes([
      {path: '/', element: <Page name="首页"/>},
      {path: '/about', Component: () => <Page name="关于"/>},
    ], '/about')
    expect(await screen.findByText('关于')).toBeInTheDocument()
  })

  it('拥有权限时渲染页面，否则渲染 unauthorized', async () => {
    const {router} = renderRoutes([
      {path: '/users', element: <Page name="用户"/>, permission: 'user:read'},
      {path: '/roles', element: <Page name="角色"/>, permission: 'role:read', unauthorized: <div>无权访问</div>},
    ], '/users')
    expect(await screen.findByText('用户')).toBeInTheDocument()

    await act(() => router.navigate('/roles'))
    expect(await screen.findByText('无权访问')).toBeInTheDocument()
    expect(screen.queryByText('角色')).not.toBeInTheDocument()
  })

  it('多个权限默认需全部拥有，permissionMode="or" 时拥有其一即可', async () => {
    const {router} = renderRoutes([
      {path: '/and', element: <Page name="and"/>, permission: ['user:read', 'user:write'], unauthorized: <div>and 未授权</div>},
      {path: '/or', element: <Page name="or"/>, permission: ['user:read', 'user:write'], permissionMode: 'or'},
    ], '/and')
    expect(await screen.findByText('and 未授权')).toBeInTheDocument()

    await act(() => router.navigate('/or'))
    expect(await screen.findByText('or')).toBeInTheDocument()
  })

  it('无权限时触发路由上的 onUnauthorized', async () => {
    const onUnauthorized = vi.fn()
    renderRoutes([{path: '/', element: <Page name="首页"/>, permission: 'admin', onUnauthorized}], '/')
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))
  })

  it('子路由同样会被守卫', async () => {
    const {router} = renderRoutes([{
      path: '/',
      element: <div>布局<Outlet/></div>,
      anonymous: true,
      children: [
        {path: 'users', element: <Page name="用户"/>, permission: 'user:read'},
        {path: 'admin', element: <Page name="管理"/>, permission: 'admin', unauthorized: <div>无权访问</div>},
      ],
    }], '/users')
    expect(await screen.findByText('用户')).toBeInTheDocument()

    await act(() => router.navigate('/admin'))
    expect(await screen.findByText('无权访问')).toBeInTheDocument()
    expect(screen.queryByText('管理')).not.toBeInTheDocument()
  })
})
