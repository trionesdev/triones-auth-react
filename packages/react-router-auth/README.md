# @trionesdev/react-router-auth

[![NPM version](https://img.shields.io/npm/v/@trionesdev/react-router-auth.svg?style=flat)](https://npmjs.com/package/@trionesdev/react-router-auth)
[![NPM downloads](http://img.shields.io/npm/dm/@trionesdev/react-router-auth.svg?style=flat)](https://npmjs.com/package/@trionesdev/react-router-auth)

基于 [React Router](https://reactrouter.com/) 的路由权限。在路由配置上声明是否允许匿名访问、需要哪些权限，创建路由时会自动包裹 [@trionesdev/auth-react](../auth-react) 的 `<Authentication>` 和 `<Authorization>`。

## 安装

```bash
pnpm add @trionesdev/react-router-auth react-router
```

本包依赖 `react-router@^8.1.0` 和 `@trionesdev/auth-react`，要求 `react` / `react-dom` >= 19.2。项目中直接使用的 `react-router` 版本需与之一致，避免出现两份 Router 上下文。

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

### createBrowserRouter / createHashRouter

```ts
createBrowserRouter(routes: RouteObject[]): DataRouter
createHashRouter(routes: RouteObject[]): DataRouter
```

与 React Router 同名函数相同，区别是接收扩展后的 `RouteObject`，并按如下规则转换每个路由（包括 `children`）：

| 配置 | 转换结果 |
| --- | --- |
| 默认 | `element` / `Component` 包裹 `<Authentication>`，需要登录才能访问 |
| `anonymous: true` | 不包裹 `<Authentication>`，允许匿名访问 |
| `permission` | 再包裹 `<Authorization value={permission}>`，需要对应权限 |

同时配置登录和权限时，结构为 `<Authentication><Authorization>页面</Authorization></Authentication>`：先校验登录，再校验权限。

> 转换会直接修改传入的 `routes` 对象，请只对同一份 `routes` 调用一次，并在组件外创建 router，不要在组件渲染时创建。

### RouteObject

在 React Router 的 `RouteObject` 基础上扩展了以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | `(...params: any[]) => string` | 路由路径，以函数形式声明，创建 router 时调用并替换为字符串 |
| `anonymous` | `boolean` | 是否允许匿名访问，默认 `false` |
| `permission` | `string \| string[]` | 所需权限，多个权限时需全部拥有（`and` 模式） |
| `unauthorized` | `ReactNode` | 无权限时渲染的内容，未配置时使用 `AuthorizationProvider` 的 `unauthorized` |
| `onUnauthorized` | `() => void` | 无权限时的回调，未配置时使用 `AuthorizationProvider` 的 `onUnauthorized` |
| `label` | `string` | 路由名称，可用于菜单、面包屑等 |
| `children` | `RouteObject[]` | 子路由，同样会被转换 |

`RouteType` 为上述扩展字段的类型，可用于自定义路由结构。

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
