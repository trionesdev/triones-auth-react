# @trionesdev/auth-react

[![NPM version](https://img.shields.io/npm/v/@trionesdev/auth-react.svg?style=flat)](https://npmjs.com/package/@trionesdev/auth-react)
[![NPM downloads](http://img.shields.io/npm/dm/@trionesdev/auth-react.svg?style=flat)](https://npmjs.com/package/@trionesdev/auth-react)

React 认证与鉴权组件：

- **认证**：`AuthenticationProvider` 加载当前用户，`<Authentication>` 保护需要登录的内容。
- **鉴权**：`AuthorizationProvider` 加载当前用户的权限，`<Authorization>` 和 `useAuthorization` 做组件级、按钮级的权限控制。

配合 [@trionesdev/react-router-auth](../react-router-auth) 可以直接在路由配置上声明登录和权限要求。

## 安装

```bash
pnpm add @trionesdev/auth-react
# 或
npm install @trionesdev/auth-react
```

要求 `react` / `react-dom` >= 19.2。

## 快速开始

```tsx
import {
  AuthenticationProvider,
  AuthorizationProvider,
  Authentication,
  Authorization,
} from "@trionesdev/auth-react";

export const App = () => (
  <AuthenticationProvider
    actorRequest={() => fetchCurrentUser()}          // 返回用户；未登录返回 null
    onUnAuthenticated={() => navigate("/sign-in")}   // 未登录访问受保护内容时
    onSignOut={() => navigate("/sign-in")}>          // 调用 signOut() 时
    <AuthorizationProvider
      authorizationRequest={() => fetchPermissions()} // 返回 {master, permissions}
      unauthorized={<div>无权访问</div>}>
      <Authentication>
        <Authorization value="user:create">
          <button>新建用户</button>
        </Authorization>
      </Authentication>
    </AuthorizationProvider>
  </AuthenticationProvider>
);
```

`AuthorizationProvider` 必须放在 `AuthenticationProvider` 内部：用户登录后才会请求权限，退出或切换用户时会自动清空并重新请求。

## 认证

### AuthenticationProvider

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `actorRequest` | `() => Promise<T \| null \| undefined>` | 获取当前用户。返回真值即为已登录；返回 `null` / `undefined`、请求失败或同步抛出异常均视为未登录。未配置时直接视为未登录。 |
| `onUnAuthenticated` | `() => void` | 未登录状态下渲染 `<Authentication>` 时触发 |
| `onSignOut` | `() => void` | 调用 `signOut()` 时触发 |

- `actorRequest` **只在挂载时调用一次**，可以直接传入内联函数，父组件重渲染不会重复请求。之后需要更新用户时使用 `setActor`。
- 所有回调都调用最新传入的函数，无需 `useCallback`。
- StrictMode 下不会重复发出请求。

### Authentication

已登录时渲染 `children`，加载中或未登录时渲染 `null`。

```tsx
<Authentication>
  <Dashboard/>
</Authentication>
```

`onUnAuthenticated` 的触发规则：

- 加载完成后仍未登录时触发；加载期间不会触发。
- 同一次渲染中多个（包括嵌套的）`<Authentication>` 只触发一次。
- 通过 `signOut()` 退出时，已显示的页面**不会**触发，由 `onSignOut` 负责后续处理；之后再进入受保护页面仍会触发。

### useAuthentication

```tsx
const {authenticationInfo, actor, setActor, signOut} = useAuthentication<User>();
```

| 返回值 | 类型 | 说明 |
| --- | --- | --- |
| `authenticationInfo.authenticationSynced` | `boolean` | 用户信息是否加载完成 |
| `authenticationInfo.authenticated` | `boolean` | 是否已登录 |
| `authenticationInfo.signedOut` | `boolean` | 是否由 `signOut()` 退出 |
| `actor` | `T \| undefined` | 当前用户 |
| `setActor` | `(actor: T \| null \| undefined) => void` | 设置当前用户（如登录成功后）；传入空值即为未登录。会丢弃仍在进行中的 `actorRequest` 结果。 |
| `signOut` | `() => void` | 退出登录并触发 `onSignOut` |
| `onUnAuthenticated` | `() => void` | Provider 上配置的回调 |

必须在 `AuthenticationProvider` 内使用，否则会抛出错误。

## 鉴权

### AuthorizationProvider

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `authorizationRequest` | `() => Promise<{master?: boolean; permissions?: any[]}>` | 获取当前用户的权限。`master: true` 表示拥有全部权限。请求失败时视为没有任何权限。未配置时视为没有任何权限。 |
| `permissionTransform` | `(value) => any` | 在比较前转换 `<Authorization value>` 等传入的所需权限，用于适配后端的权限结构。配置了 `customAuthenticate` 时无效。 |
| `customAuthenticate` | `(required, permissions, mode) => boolean` | 完全自定义鉴权逻辑 |
| `unauthorized` | `ReactNode` | 无权限时的默认渲染内容 |
| `onUnauthorized` | `() => void` | 无权限时的默认回调 |

- 每次登录（包括 `setActor` 切换用户）后调用一次 `authorizationRequest`；未登录时不会请求。
- 切换用户或退出后，旧权限在渲染时就会被隐藏，不会闪现上一用户的内容。
- `authorizationRequest` 同样可以传入内联函数。

默认鉴权规则：

- 字符串、数字等基本类型权限按值比较；对象类型权限做深比较（`lodash-es` 的 `isEqual`）。
- `mode="and"`（默认）要求拥有全部所需权限，`mode="or"` 只需拥有其中一个。

### Authorization

```tsx
<Authorization value="user:create">…</Authorization>
<Authorization value={["user:create", "user:update"]}>…</Authorization>            {/* 全部拥有 */}
<Authorization value={["user:create", "user:update"]} mode="or">…</Authorization>  {/* 拥有其一 */}
<Authorization authenticate={(permissions) => permissions.length > 0}>…</Authorization>
```

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `value` | `string \| string[]` | 所需权限 |
| `mode` | `'and' \| 'or'` | 鉴权模式，默认 `'and'` |
| `authenticate` | `(permissions: any[]) => boolean` | 组件级自定义鉴权，参数为当前用户拥有的权限 |
| `unauthorized` | `ReactNode` | 无权限时渲染的内容，未配置时使用 Provider 的 `unauthorized` |
| `onUnauthorized` | `() => void` | 无权限时的回调，未配置时使用 Provider 的 `onUnauthorized` |

- `master` 用户总是有权限。
- 权限加载期间渲染 `null`，不会触发 `onUnauthorized`。
- `onUnauthorized` 只在变为无权限时触发一次，传入内联函数也不会因重渲染而重复触发。

### useAuthorization

```tsx
const {hasAll, hasAny, permissions, master} = useAuthorization();

hasAll(["user:create", "user:update"]); // 全部拥有
hasAny(["user:create", "user:update"]); // 拥有其一
```

| 返回值 | 类型 | 说明 |
| --- | --- | --- |
| `authorizationSynced` | `boolean` | 权限是否加载完成 |
| `master` | `boolean` | 是否超级管理员 |
| `permissions` | `any[]` | 当前用户拥有的权限 |
| `hasAll` | `(value) => boolean` | 是否拥有全部权限 |
| `hasAny` | `(value) => boolean` | 是否拥有其中一个权限 |
| `authenticate` | `(value, mode) => boolean` | 按指定模式鉴权 |
| `setPermissions` | `(permissions?: any[]) => void` | 手动设置当前权限 |
| `setMaster` | `(value: boolean) => void` | 手动设置是否超级管理员 |
| `unauthorized` / `onUnauthorized` | | Provider 上的配置 |

未包裹在 `AuthorizationProvider` 内时，`hasAll` / `hasAny` 始终返回 `false`。

## 示例

完整示例见 [examples/react-demo](../../examples/react-demo)，包含登录、退出、路由鉴权、组件鉴权和对应的测试用例。

## 开发

```bash
pnpm install
pnpm --filter @trionesdev/auth-react dev     # 监听构建
pnpm --filter @trionesdev/auth-react build   # 构建到 dist
pnpm --filter react-demo test                # 运行测试（直接测试源码，无需构建）
```

## LICENSE

MIT

## 关注我们，一起交流
> 留言回复不及时，可以通过关注公众号联系我们

<div style="width: 100%;text-align: center;">
<img src="../../images/shuque_wx.jpg" width="200px" alt="">
</div>
