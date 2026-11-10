import {useCallback, useRef} from "react";

/** 始终持有最新值的 ref，避免把不稳定的 props 放进 Effect 依赖。 */
export function useLatest<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

/** 返回引用稳定的回调，调用时总是执行最新传入的函数。 */
export function useEventCallback<A extends any[], R>(fn?: (...args: A) => R) {
    const ref = useLatest(fn);
    return useCallback((...args: A) => ref.current?.(...args), [ref]);
}
