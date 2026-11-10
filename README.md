# triones-auth-react

React 认证、鉴权与路由权限公共库。

| 包 | 说明 |
| --- | --- |
| [@trionesdev/auth-react](packages/auth-react/README.md) | 认证（`AuthenticationProvider` / `Authentication`）与鉴权（`AuthorizationProvider` / `Authorization` / `useAuthorization`） |
| [@trionesdev/react-router-auth](packages/react-router-auth/README.md) | 基于 React Router 的路由权限：在路由配置上声明 `anonymous`、`permission` 等字段 |
| [react-demo](examples/react-demo/README.md) | 示例应用与测试用例 |

## 功能

- **认证**：加载当前用户，保护需要登录的内容，统一处理未登录与退出登录。
- **鉴权**：加载当前用户的权限，支持 `and` / `or` 模式、超级管理员、对象类型权限、自定义权限转换与鉴权逻辑。
- **路由**：在路由配置中声明是否允许匿名访问以及所需权限，自动包裹认证与鉴权组件。

## 快速开始

```bash
pnpm add @trionesdev/auth-react @trionesdev/react-router-auth react-router
```

```tsx
import {AuthenticationProvider, AuthorizationProvider} from "@trionesdev/auth-react";
import {createHashRouter, RouteObject} from "@trionesdev/react-router-auth";
import {RouterProvider} from "react-router/dom";

const routes: RouteObject[] = [
  {path: () => "/sign-in", element: <SignInPage/>, anonymous: true},
  {path: () => "/", element: <DashboardPage/>},
  {path: () => "/users", element: <UsersPage/>, permission: "user:read", unauthorized: <div>无权访问</div>},
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

各组件的完整 API 见 [@trionesdev/auth-react](packages/auth-react/README.md)。

## 本地开发

本仓库使用 pnpm workspace + Lerna 管理。

```bash
pnpm install
pnpm run build                    # 构建全部包
pnpm --filter react-demo dev      # 启动示例应用
pnpm --filter react-demo test     # 运行测试
```

| 目录 | 说明 |
| --- | --- |
| `packages/auth-react` | `@trionesdev/auth-react` 源码 |
| `packages/react-router-auth` | `@trionesdev/react-router-auth` 源码 |
| `examples/react-demo` | 示例应用，测试用例也在这里（`src/test`） |

## 关注我们，一起交流
> 留言回复不及时，可以通过关注公众号联系我们
<div style="width: 100%;text-align: center;">
<img src="images/shuque_wx.jpg" width="200px" alt="">
</div>

## LICENSE

MIT
