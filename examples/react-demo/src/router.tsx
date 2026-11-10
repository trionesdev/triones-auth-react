import {createHashRouter, RouteObject} from "@trionesdev/react-router-auth";
import {SignInPage} from "./SignInPage";
import {DashboardPage} from "./DashboardPage";
import {SecurityPage} from "./SecurityPage";
import {PermissionPage} from "./PermissionPage.tsx";
import {RouterProvider} from "react-router/dom";

export const routes: RouteObject[] = [
    {
        path: () => "/sign-in",
        element: <SignInPage/>,
        anonymous: true
    },
    {
        path: () => "/",
        element: <DashboardPage/>,
    },
    {
        path: () => "/security",
        element: <SecurityPage/>,
        permission: "security",
        unauthorized: <div>未授权</div>,
    },
    {
        path: () => '/authorization',
        element: <PermissionPage/>,
    }
]

// 在组件外创建一次，避免每次渲染都重新创建 router
const router = createHashRouter(routes);

export const AppRouter = () => {
    return <RouterProvider router={router}/>;
};