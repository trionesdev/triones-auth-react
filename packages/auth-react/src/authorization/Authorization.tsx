import React, {FC, useEffect} from "react";
import {useAuthorization} from "./use-authorization";
import {Mode} from "./types";
import {useLatest} from "../utils/use-latest";

type AuthorizationProps = {
    children?: React.ReactNode;
    value?: string | string[]; //鉴权需要的权限
    /**
     * 自定义鉴权
     * @param permissions 当前用户拥有的权限策略
     */
    authenticate?: (permissions: any[]) => boolean;
    /**
     * 未授权时的内容
     */
    unauthorized?: React.ReactNode | React.ReactElement;
    onUnauthorized?: () => void; //未授权时的回调
    /**
     * mode:鉴权模式，and:必须同时拥有权限，or:只要拥有其中一个权限即可
     */
    mode?: Mode
};
export const Authorization: FC<AuthorizationProps> = ({
    children, value, authenticate, unauthorized, onUnauthorized, mode = 'and'
}) => {
    const authorization = useAuthorization();
    const synced = Boolean(authorization.authorizationSynced);
    const authorized = synced && Boolean(authorization.master || (authenticate
        ? authenticate(authorization.permissions ?? [])
        : authorization.authenticate?.(value, mode)));

    // 回调放进 ref，只在“变为未授权”时触发一次，不受内联函数引用变化影响。
    const unauthorizedRef = useLatest(onUnauthorized ?? authorization.onUnauthorized);
    useEffect(() => {
        if (synced && !authorized) unauthorizedRef.current?.();
    }, [synced, authorized, unauthorizedRef]);

    if (!synced) return null;
    return <>{authorized ? children : (unauthorized ?? authorization.unauthorized ?? null)}</>;
};
