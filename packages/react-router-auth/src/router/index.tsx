import {
    convertRoutes,
    trionesCreateBrowserRouter as createBrowserRouter,
    trionesCreateHashRouter as createHashRouter,
    trionesCreateMemoryRouter as createMemoryRouter
} from "./hooks";
import {AuthorizationMode, RouteItem as RouteType, TrionesRouteObject as RouteObject} from "./RouteObject";


export type {
    AuthorizationMode, RouteType, RouteObject
};
export {
    convertRoutes,
    createBrowserRouter,
    createHashRouter,
    createMemoryRouter,
};
