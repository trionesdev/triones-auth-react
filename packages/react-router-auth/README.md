# @trionesdev/react-router-auth

[![NPM version](https://img.shields.io/npm/v/@trionesdev/react-router-auth.svg?style=flat)](https://npmjs.com/package/@trionesdev/react-router-auth)
[![NPM downloads](http://img.shields.io/npm/dm/@trionesdev/react-router-auth.svg?style=flat)](https://npmjs.com/package/@trionesdev/react-router-auth)

基于 [React Router](https://reactrouter.com/) 的路由权限。在路由配置上声明是否允许匿名访问、需要哪些权限，创建路由时会自动包裹 [@trionesdev/auth-react](../auth-react) 的 `<Authentication>` 和 `<Authorization>`。

## 安装

```bash
pnpm add @trionesdev/react-router-auth @trionesdev/auth-react react-router
```

`react-router@^8.1.0`、`@trionesdev/auth-react`、`react` / `react-dom` >= 19.2 均为 peerDependencies，由项目自行安装，保证与项目使用同一份 Router 和认证上下文。

## 快速开始

```tsx
import {AuthenticationProvider, AuthorizationProvider} from "@trionesdev/auth-react";
import {createHashRouter, RouteObject} from "@trionesdev/react-router-auth";
import {RouterProvider} from "react-router/dom";

const routes: RouteObject[] = [
  {path: () => "/sign-in", element: <SignInPage/>, anonymous: true},
  {path: () => "/", element: <DashboardPage/>},
  {
    path: () => "/users",
    element: <UsersPage/>,
    permission: "user:read",
    unauthorized: <div>无权访问</div>,
  },
];

// 在组件外创建一次
const router = createHashRouter(routes);

export const App = () => (
  <AuthenticationProvider
    actorRequest={() => fetchCurrentUser()}
    onUnAuthenticated={() => router.navigate("/sign-in")}
    onSignOut={() => router.navigate("/sign-in")}>
    <AuthorizationProvider authorizationRequest={() => fetchPermissions()}>
      <RouterProvider router={router}/>
    </AuthorizationProvider>
  </AuthenticationProvider>
);
```

`RouterProvider` 必须放在 `AuthenticationProvider` 和 `AuthorizationProvider` 内部。

## API

### createBrowserRouter / createHashRouter / createMemoryRouter

```ts
createBrowserRouter(routes: RouteObject[], opts?): Router
createHashRouter(routes: RouteObject[], opts?): Router
createMemoryRouter(routes: RouteObject[], opts?): Router  // 适用于测试、SSR 等场景
```

与 React Router 同名函数相同（`opts` 如 `basename`、`initialEntries` 原样透传），区别是接收扩展后的 `RouteObject`，先经过 `convertRoutes` 转换。

建议在组件外创建 router，避免每次渲染都重新创建。

### convertRoutes

```ts
convertRoutes(routes: RouteObject[]): ReactRouter.RouteObject[]
```

将扩展的路由配置转换为 React Router 的路由配置，可配合 `useRoutes` 或自定义的 `create*Router` 使用。转换**不会修改**传入的 `routes`，可以对同一份配置重复调用。按如下规则转换每个路由（包括 `children`）：

| 配置 | 转换结果 |
| --- | --- |
| 默认 | 页面包裹 `<Authentication>`，需要登录才能访问 |
| `anonymous: true` | 不包裹 `<Authentication>`，允许匿名访问 |
| `permission` | 再包裹 `<Authorization>`，需要对应权限 |

- 同时配置登录和权限时，结构为 `<Authentication><Authorization>页面</Authorization></Authentication>`：先校验登录，再校验权限。
- `Component` 会被转换为包裹后的 `element`。
- 没有 `element` / `Component` 的路由（如只有 `children` 的分组路由）不会被包裹，其子路由各自按配置守卫。
- 通过 `lazy` 加载的页面不会被包裹，需要守卫时请使用 `element` / `Component`。
- 其它 React Router 字段（`loader`、`handle`、`errorElement` 等）原样保留。

### RouteObject

在 React Router 的 `RouteObject` 基础上扩展了以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | `string \| ((...params: any[]) => string)` | 路由路径；为函数时在转换时以无参方式调用，原配置中的函数保留，可继续用于生成链接 |
| `anonymous` | `boolean` | 是否允许匿名访问，默认 `false` |
| `permission` | `string \| string[]` | 所需权限 |
| `permissionMode` | `'and' \| 'or'` | 多个权限时的鉴权模式：`and`（默认）需全部拥有，`or` 拥有其一即可 |
| `unauthorized` | `ReactNode` | 无权限时渲染的内容，未配置时使用 `AuthorizationProvider` 的 `unauthorized` |
| `onUnauthorized` | `() => void` | 无权限时的回调，未配置时使用 `AuthorizationProvider` 的 `onUnauthorized` |
| `label` | `string` | 路由名称，可用于菜单、面包屑等 |
| `children` | `RouteObject[]` | 子路由，同样会被转换 |

`RouteType` 为上述扩展字段的类型，`AuthorizationMode` 为 `permissionMode` 的类型，可用于自定义路由结构。

未登录、未授权时的跳转与回调规则见 [@trionesdev/auth-react](../auth-react/README.md)。

## 示例

完整示例见 [examples/react-demo](../../examples/react-demo)。

## 开发

```bash
pnpm install
pnpm --filter @trionesdev/react-router-auth dev     # 监听构建
pnpm --filter @trionesdev/react-router-auth build   # 构建到 dist
```

## LICENSE

MIT
