import {createContext} from "react";

export type AuthenticationInfo = {
    authenticationSynced: boolean;
    authenticated: boolean;
    /** 是否由 signOut 主动退出导致的未认证 */
    signedOut?: boolean;
};

export interface AuthenticationContextValue<TActor = any> {
    authenticationInfo?: AuthenticationInfo;
    /**
     * 当前用户信息
     */
    actor?: TActor;
    setActor?: (actor: TActor | null | undefined) => void;
    /**
     * 未认证时的回调
     */
    onUnAuthenticated?: () => void;
    signOut?: () => void;
}

export const AuthenticationContext = createContext<AuthenticationContextValue<any> | null>(null);
