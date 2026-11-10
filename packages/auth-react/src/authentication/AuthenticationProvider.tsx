import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AuthenticationContext, AuthenticationInfo} from "./context";
import {useEventCallback, useLatest} from "../utils/use-latest";

type AuthProviderProps<T = any> = {
    children: React.ReactNode;
    /** 根据 token 获取当前用户；未登录时可以返回 null。仅在挂载时调用一次，可以传入内联函数。 */
    actorRequest?: () => Promise<T | null | undefined>;
    onUnAuthenticated?: () => void;
    onSignOut?: () => void;
};

type AuthenticationState<T> = {
    authenticationInfo: AuthenticationInfo;
    actor?: T;
};

export function AuthenticationProvider<T = any>({
    children, actorRequest, onUnAuthenticated, onSignOut
}: AuthProviderProps<T>) {
    // 没有 actorRequest 时直接视为已同步、未认证，省去一次额外渲染。
    const [state, setState] = useState<AuthenticationState<T>>(() => ({
        authenticationInfo: {authenticationSynced: !actorRequest, authenticated: false}
    }));
    const requestRef = useLatest(actorRequest);
    const requestVersion = useRef(0);

    const updateActor = useCallback((actor: T | null | undefined, signedOut = false) => {
        setState({
            authenticationInfo: {authenticationSynced: true, authenticated: Boolean(actor), signedOut},
            actor: actor || undefined
        });
    }, []);

    useEffect(() => {
        const request = requestRef.current;
        if (!request) return;
        const version = ++requestVersion.current;
        const isCurrent = () => version === requestVersion.current;
        // 延迟到微任务中调用：StrictMode 下被立即卸载的 Effect 不会发出请求，同步异常也按认证失败处理。
        Promise.resolve()
            .then(() => isCurrent() ? request() : undefined)
            .then(
                (actor) => { if (isCurrent()) updateActor(actor); },
                () => { if (isCurrent()) updateActor(undefined); }
            );
        return () => { ++requestVersion.current; };
    }, [requestRef, updateActor]);

    const setActor = useCallback((actor: T | null | undefined) => {
        ++requestVersion.current; // 丢弃仍在进行中的请求结果
        updateActor(actor);
    }, [updateActor]);

    const handleSignOut = useEventCallback(onSignOut);
    const signOut = useCallback(() => {
        ++requestVersion.current;
        updateActor(undefined, true);
        handleSignOut();
    }, [updateActor, handleSignOut]);

    // 嵌套的多个 <Authentication> 会在同一次提交中依次触发，合并为一次回调。
    const notifyPending = useRef(false);
    const notifyUnAuthenticated = useEventCallback(onUnAuthenticated);
    const handleUnAuthenticated = useCallback(() => {
        if (notifyPending.current) return;
        notifyPending.current = true;
        Promise.resolve().then(() => { notifyPending.current = false; });
        notifyUnAuthenticated();
    }, [notifyUnAuthenticated]);

    const contextValue = useMemo(() => ({
        ...state,
        setActor,
        onUnAuthenticated: handleUnAuthenticated,
        signOut
    }), [state, setActor, handleUnAuthenticated, signOut]);

    return <AuthenticationContext.Provider value={contextValue}>{children}</AuthenticationContext.Provider>;
}
