import {RouteObject} from "react-router";
import {Authorization} from "@trionesdev/auth-react";
import React from "react";

export type AuthorizationMode = NonNullable<React.ComponentProps<typeof Authorization>["mode"]>;

export type RouteItem = {
    /**
     * 路由名称
     */
    label?: string;
    id?: string;
    /**
     * 路由，可以是字符串，也可以是根据参数生成路由的函数（创建路由时以无参方式调用）
     * @param params
     */
    path?: string | ((...params: any[]) => string);
    /**
     * 是否允许匿名访问
     */
    anonymous?: boolean;
    /**
     * 权限
     */
    permission?: string | string[];
    /**
     * 权限鉴权模式，and:必须同时拥有权限，or:只要拥有其中一个权限即可，默认 and
     */
    permissionMode?: AuthorizationMode;
    /**
     * 未授权时的内容
     */
    unauthorized?: React.ReactElement | React.ReactNode; //未授权时的内容
    /**
     * 未授权时的回调
     */
    onUnauthorized?: () => void; //未授权时的回调
};

/** 对联合类型逐个 Omit，保留 index 路由与普通路由的区分 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type TrionesRouteObject = DistributiveOmit<RouteObject, "id" | "path" | "children"> &
    RouteItem & {
    children?: TrionesRouteObject[];
};
