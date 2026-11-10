# react-demo

[`@trionesdev/auth-react`](../../packages/auth-react) 与 [`@trionesdev/react-router-auth`](../../packages/react-router-auth) 的示例应用，基于 React 19 + Vite + React Router，演示认证、路由级鉴权和组件级鉴权的完整流程。

## 快速开始

在仓库根目录安装依赖并构建工作区包（demo 通过 `workspace:*` 引用它们的 `dist`）：

```bash
pnpm install
pnpm run build
```

启动 demo：

```bash
pnpm --filter react-demo dev
```

打开终端输出的地址（默认 <http://localhost:5173>），会自动跳转到登录页 `/#/sign-in`，点击「进入」即可以 `admin` 身份登录。

## 演示内容

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/sign-in` | [SignInPage](src/SignInPage.tsx) | `anonymous: true`，无需登录；点击「进入」调用 `setActor` 登录 |
| `/` | [DashboardPage](src/DashboardPage.tsx) | 需要登录；展示当前用户，演示 `setActor` 切换用户和 `signOut` 退出 |
| `/security` | [SecurityPage](src/SecurityPage.tsx) | 路由级鉴权：需要 `security` 权限，无权限时显示「未授权」 |
| `/authorization` | [PermissionPage](src/PermissionPage.tsx) | 组件级鉴权：`<Authorization>` 的 `and` / `or` 模式 |

### 认证与权限配置

[App.tsx](src/App.tsx) 中配置了两个 Provider：

```tsx
<AuthenticationProvider
    actorRequest={() => Promise.resolve(false)}           // 模拟未登录：启动时总是跳到登录页
    onUnAuthenticated={() => window.location.href = "/#/sign-in"}
    onSignOut={() => window.location.href = "/#/sign-in"}>
    <AuthorizationProvider authorizationRequest={() => Promise.resolve({
        master: false,
        permissions: ["security", "create", "update"]    // 当前用户拥有的权限
    })}>
        <AppRouter/>
    </AuthorizationProvider>
</AuthenticationProvider>
```

- `actorRequest` 在挂载时调用一次，返回用户对象即为已登录，返回 `null` / `false` 或请求失败即为未登录。实际项目中通常在这里根据 token 请求当前用户。
- `authorizationRequest` 在每次登录（包括 `setActor` 切换用户）后调用；`master: true` 表示拥有全部权限。
- 两个请求函数都可以直接写成内联函数，父组件重渲染不会重复请求。
- `signOut()` 只触发 `onSignOut`；未登录访问受保护页面时触发 `onUnAuthenticated`，嵌套的受保护路由只会触发一次。

### 路由配置

[router.tsx](src/router.tsx) 使用 `@trionesdev/react-router-auth` 的 `createHashRouter`，在标准 `RouteObject` 上扩展了以下字段：

| 字段 | 说明 |
| --- | --- |
| `anonymous` | 为 `true` 时不包裹 `<Authentication>`，无需登录即可访问 |
| `permission` | 访问路由所需的权限，自动包裹 `<Authorization>` |
| `unauthorized` | 无权限时渲染的内容 |
| `onUnauthorized` | 无权限时的回调 |
| `path` | 字符串，或返回路径字符串的函数 |
| `permissionMode` | 多个权限时的鉴权模式，`and`（默认）或 `or` |
| `label` | 路由名称 |

### 组件级鉴权

[PermissionPage](src/PermissionPage.tsx) 中，当前用户拥有 `create`、`update`，因此：

| 写法 | 是否显示 |
| --- | --- |
| `<Authorization value={['create']}>` | ✅ |
| `<Authorization value={['create', 'update']}>` | ✅（`and`：全部拥有） |
| `<Authorization value={['create', 'update']} mode="or">` | ✅（`or`：拥有其一） |
| `<Authorization value={['create', 'delete']}>` | ❌ |
| `<Authorization value={['delete']} mode="or">` | ❌ |

## 测试

测试基于 [Vitest](https://vitest.dev/) + jsdom + [Testing Library](https://testing-library.com/)。[vitest.config.ts](vitest.config.ts) 将两个工作区包直接指向源码，**运行测试前无需构建**。

```bash
pnpm --filter react-demo test        # 运行一次
pnpm --filter react-demo test:watch  # 监听模式
```

| 文件 | 覆盖内容 |
| --- | --- |
| [authentication.test.tsx](src/test/authentication.test.tsx) | 请求成功 / 返回 null / 失败；加载中状态；`onUnAuthenticated` 去重；`signOut`；`setActor` 竞态；StrictMode；内联请求不重复调用 |
| [authorization.test.tsx](src/test/authorization.test.tsx) | `and` / `or` / `master`；对象权限；`permissionTransform`；`customAuthenticate`；未授权内容与回调；切换用户与退出；`useAuthorization` |
| [router.test.tsx](src/test/router.test.tsx) | `convertRoutes` 不修改原配置；`anonymous` / `permission` / `permissionMode`；`Component` 转换；子路由守卫 |
| [App.test.tsx](src/test/App.test.tsx) | demo 端到端流程：跳转登录、登录、路由鉴权、组件鉴权、退出 |

测试相关的辅助文件：

- [src/test/setup.ts](src/test/setup.ts)：注册 jest-dom 断言；并修补 `Request`，避免 react-router 导航时 jsdom 的 `AbortSignal` 被 Node 内置 `Request` 拒绝。
- [src/test/utils.ts](src/test/utils.ts)：`deferred()`，用于手动控制请求的完成时机，测试加载中与竞态场景。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查并构建 |
| `pnpm preview` | 预览构建结果 |
| `pnpm lint` | ESLint 检查 |
| `pnpm test` | 运行测试 |
| `pnpm test:watch` | 以监听模式运行测试 |

以上命令在 `examples/react-demo` 目录下执行；在仓库根目录可使用 `pnpm --filter react-demo <script>`。
