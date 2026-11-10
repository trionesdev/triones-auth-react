import React, {FC, useEffect, useRef} from "react";
import {useAuthentication} from "./use-authentication";

type AuthenticationProps = {
    children?: React.ReactNode;
};
export const Authentication: FC<AuthenticationProps> = ({children}) => {
    const {authenticationInfo, onUnAuthenticated} = useAuthentication();
    const synced = Boolean(authenticationInfo?.authenticationSynced);
    const authenticated = synced && Boolean(authenticationInfo?.authenticated);
    const signedOut = Boolean(authenticationInfo?.signedOut);
    const wasAuthenticated = useRef(false);

    useEffect(() => {
        // 已展示的页面因 signOut 退出时交给 onSignOut 处理；新进入受保护页面时仍然触发。
        if (synced && !authenticated && !(signedOut && wasAuthenticated.current)) {
            onUnAuthenticated?.(); //未认证时候触发
        }
        wasAuthenticated.current = authenticated;
    }, [synced, authenticated, signedOut, onUnAuthenticated]);

    return authenticated ? <>{children}</> : null;
};
