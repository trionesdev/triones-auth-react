import {useContext} from "react";
import {AuthorizationContext} from "./context";
import {UseAuthorizationProps} from "./types";

export const useAuthorization = (): UseAuthorizationProps => useContext(AuthorizationContext);
