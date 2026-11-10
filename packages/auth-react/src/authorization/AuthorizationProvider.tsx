import React, {FC, useCallback, useEffect, useMemo, useState} from "react";
import {AuthorizationContext} from "./context";
import {AuthorizationResponse, Mode} from "./types";
import {useAuthentication} from "../authentication";
import {AuthenticationInfo} from "../authentication/context";
import {useEventCallback, useLatest} from "../utils/use-latest";
import {isEqual} from "lodash-es";

const identity = (permission: any) => permission;
const EMPTY_PERMISSIONS: any[] = [];

type PermissionProviderProps = {
    children?: React.ReactNode;
    /**
     * 权限请求，返回一个PolicyResponse；在每次认证会话开始时调用，可以传入内联函数
     * @param params
     */
    authorizationRequest?: (params?: any) => Promise<AuthorizationResponse>;
    /**
     * 权限格式转换，适配前端k-v模式，当配置customAuthenticate 时，该参数无效
     * @param policy
     */
    permissionTransform?: (policy: any | any[]) => any;
    /**
     * 自定义鉴权
     * @param permission 需要的权限
     * @param permissions 当前用户拥有的权限策略
     */
    customAuthenticate?: (permission: any | any[], permissions: any[], mode: Mode) => boolean;
    unauthorized?: React.ReactElement | React.ReactNode; //未授权时的内容
    onUnauthorized?: () => void; //未授权时的回调
};

type AuthorizationState = {
    /** 这份权限所属的认证会话 */
    owner?: AuthenticationInfo;
    synced: boolean;
    master: boolean;
    permissions: any[];
};

export const AuthorizationProvider: FC<PermissionProviderProps> = ({
    children, authorizationRequest, permissionTransform = identity,
    customAuthenticate, unauthorized, onUnauthorized
}) => {
    const {authenticationInfo} = useAuthentication();
    const requestRef = useLatest(authorizationRequest);
    const [state, setState] = useState<AuthorizationState>({
        synced: false, master: false, permissions: EMPTY_PERMISSIONS
    });

    // 渲染时即按会话过滤，切换用户或退出后不会在 Effect 执行前闪现上一会话的权限。
    const authenticated = Boolean(authenticationInfo?.authenticationSynced && authenticationInfo.authenticated);
    const authorizationSynced = authenticated && state.owner === authenticationInfo && state.synced;
    const master = authorizationSynced && state.master;
    const permissions = authorizationSynced ? state.permissions : EMPTY_PERMISSIONS;

    useEffect(() => {
        if (!authenticated) return;
        let cancelled = false;
        const request = requestRef.current;
        const settle = (res?: AuthorizationResponse) => {
            // 加载失败时同样结束加载，但不保留任何旧权限。
            if (!cancelled) setState({
                owner: authenticationInfo, synced: true,
                master: res?.master ?? false, permissions: res?.permissions ?? EMPTY_PERMISSIONS
            });
        };
        if (!request) {
            settle();
            return;
        }
        Promise.resolve()
            .then(() => cancelled ? undefined : request())
            .then(settle, () => settle());
        return () => { cancelled = true; };
    }, [authenticationInfo, authenticated, requestRef]);

    const setMaster = useCallback((value: boolean) => {
        setState(prev => ({...prev, master: value}));
    }, []);
    const setPermissions = useCallback((value?: any[]) => {
        setState(prev => ({...prev, permissions: value ?? EMPTY_PERMISSIONS}));
    }, []);

    // 基本类型权限用 Set 做 O(1) 匹配，对象类型权限才退回到 isEqual 深比较。
    const permissionSet = useMemo(() => new Set(permissions), [permissions]);

    const authenticate = useCallback((filter: any | any[], mode: Mode = 'and') => {
        if (!authorizationSynced) return false;
        if (master) return true;
        if (customAuthenticate) return customAuthenticate(filter, permissions, mode);
        const transformed = permissionTransform(filter);
        const required: any[] = Array.isArray(transformed) ? transformed : [transformed];
        const matches = (item: any) => (item === null || typeof item !== 'object')
            ? permissionSet.has(item)
            : permissions.some(permission => isEqual(permission, item));
        return mode === 'or' ? required.some(matches) : required.every(matches);
    }, [authorizationSynced, master, customAuthenticate, permissions, permissionSet, permissionTransform]);
    const hasAll = useCallback((value: any | any[]) => authenticate(value, 'and'), [authenticate]);
    const hasAny = useCallback((value: any | any[]) => authenticate(value, 'or'), [authenticate]);
    const handleUnauthorized = useEventCallback(onUnauthorized);

    const contextValue = useMemo(() => ({
        authorizationSynced, master, permissions, setMaster, setPermissions,
        authenticate, hasAll, hasAny, unauthorized, onUnauthorized: handleUnauthorized
    }), [authorizationSynced, master, permissions, setMaster, setPermissions,
        authenticate, hasAll, hasAny, unauthorized, handleUnauthorized]);

    return <AuthorizationContext.Provider value={contextValue}>{children}</AuthorizationContext.Provider>;
};
