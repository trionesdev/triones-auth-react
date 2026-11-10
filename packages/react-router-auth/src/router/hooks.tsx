import React from "react";
import {Authentication, Authorization} from "@trionesdev/auth-react";
import {createBrowserRouter, createHashRouter, createMemoryRouter, RouteObject} from "react-router";
import {TrionesRouteObject} from "./RouteObject";

/** 按路由配置为页面包裹鉴权与认证：<Authentication><Authorization>页面</Authorization></Authentication> */
const guard = (route: TrionesRouteObject, page: React.ReactNode) => {
    let guarded = page;
    if (route.permission) {
        guarded = (
            <Authorization value={route.permission} mode={route.permissionMode}
                           unauthorized={route.unauthorized} onUnauthorized={route.onUnauthorized}>
                {guarded}
            </Authorization>
        );
    }
    if (!route.anonymous) {
        guarded = <Authentication>{guarded}</Authentication>;
    }
    return guarded;
};

/**
 * 将扩展的路由配置转换为 React Router 的路由配置。
 * 不会修改传入的 routes，可以对同一份配置重复调用。
 */
export const convertRoutes = (routes: TrionesRouteObject[]): RouteObject[] => {
    return routes.map((route) => {
        const {path, children, Component, element, ...rest} = route;
        const converted: Record<string, unknown> = {
            ...rest,
            path: typeof path === "function" ? path() : path,
        };
        const page = Component ? <Component/> : element;
        // element 为空（如布局路由未配置页面）时保持原样，不额外包裹
        if (page !== undefined && page !== null) {
            converted.element = guard(route, page);
        }
        if (children) {
            converted.children = convertRoutes(children);
        }
        return converted as RouteObject;
    });
};

type BrowserRouterOpts = Parameters<typeof createBrowserRouter>[1];
type HashRouterOpts = Parameters<typeof createHashRouter>[1];
type MemoryRouterOpts = Parameters<typeof createMemoryRouter>[1];

export const trionesCreateBrowserRouter = (routes: TrionesRouteObject[], opts?: BrowserRouterOpts) => {
    return createBrowserRouter(convertRoutes(routes), opts);
};

export const trionesCreateHashRouter = (routes: TrionesRouteObject[], opts?: HashRouterOpts) => {
    return createHashRouter(convertRoutes(routes), opts);
};

export const trionesCreateMemoryRouter = (routes: TrionesRouteObject[], opts?: MemoryRouterOpts) => {
    return createMemoryRouter(convertRoutes(routes), opts);
};
