import {
  key,
  reducer,
  subscription,
  StoreOptions,
  logLevel,
  dispatchCallback,
  extendedDispatch,
} from "./types";

interface StoreProperties<S extends Record<key, unknown>> {
  currentStoreState: Partial<S>;
  pendingStoreState: Partial<S>;
  reducers: Map<key, reducer<unknown, unknown>>;
  subscriptions: subscription<S>[];
  options: StoreOptions;
  callbackQueue: [key | undefined, dispatchCallback<unknown>][];
  delayed: boolean;
  effects: Map<key, void | (() => void)>;
  pendingEffects: Set<key>;
  callingSubscriptions: boolean;
}

const mapLogLevels: Record<logLevel, number> = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

function measurePerformance(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

export function createStore<S extends Record<key, unknown>>(
  initial: Partial<S>,
  options: StoreOptions = {}
) {
  const props: StoreProperties<S> = {
    currentStoreState: initial,
    pendingStoreState: initial,
    reducers: new Map(),
    subscriptions: [],
    options,
    callbackQueue: [],
    delayed: false,
    effects: new Map(),
    pendingEffects: new Set(),
    callingSubscriptions: false,
  };

  const loggingActive =
    (options.development || options.logLevel) && !options.production;

  const log = loggingActive
    ? (threshold: logLevel, ...messages: unknown[]) => {
        if (
          mapLogLevels[props.options.logLevel ?? "WARN"] <
          mapLogLevels[threshold]
        )
          return;
        switch (threshold) {
          case "ERROR":
            console.error("[JLS-ERROR]:", ...messages);
            break;
          case "WARN":
            console.warn("[JLS-WARN]:", ...messages);
            break;
          case "INFO":
            console.log("[JLS-INFO]:", ...messages);
            break;
          case "DEBUG":
            console.log("[JLS-DEBUG]:", ...messages);
        }
      }
    : () => {
        return;
      };

  function getState() {
    return props.currentStoreState;
  }

  function getPendingState() {
    return props.pendingStoreState;
  }

  function getOptions() {
    return props.options;
  }

  function subscribe(subscription: subscription<S>): void {
    if (typeof subscription !== "function") {
      log("ERROR", "No subscription method provided");
      return;
    }
    props.subscriptions.push(subscription);
  }

  function refresh(): void {
    log("INFO", "REFRESHING");
    props.currentStoreState = props.pendingStoreState;
    props.callingSubscriptions = true;
    const measure = loggingActive ? measurePerformance() : false;
    props.subscriptions.forEach((subscription) => {
      try {
        subscription(props.currentStoreState);
      } catch (err) {
        log("WARN", "Ignored error while executing subscriptions");
        log("DEBUG", "ERROR, MESSAGE", err);
      }
    });
    measure && log("INFO", `Called Subscriptions in ${measure()} ms`);
    props.callingSubscriptions = false;
    _checkEffects();
    props.callbackQueue.forEach(([name, callback]) => {
      try {
        callback(name ? props.currentStoreState[name] : undefined);
      } catch (err) {
        log("WARN", "Ignored error while executing callbacks");
      }
    });
    props.callbackQueue = [];
  }

  function register<CA, CS>(
    name: keyof S,
    reducer: reducer<CA, CS>,
    initialState: CS
  ): void {
    if (name in props.reducers) {
      log("WARN", `Redundant register call for <${String(name)}> was ignored.`);
      return;
    }
    props.reducers.set(name, reducer as reducer<unknown, unknown>);
    props.currentStoreState[name] = initialState as S[keyof S];
    props.pendingStoreState[name] = initialState as S[keyof S];
  }

  function useReducer<CA, CS>(
    name: keyof S,
    reducer: reducer<CA, CS>,
    initialState: CS
  ): [CS, extendedDispatch<CA, CS>] {
    if (name in props.reducers)
      return [
        props.currentStoreState[name] as CS,
        extendDispatch<CA, CS>(name),
      ];
    register(name, reducer, initialState);
    return [initialState, extendDispatch<CA, CS>(name)];
  }

  function dispatch<CA, CS>(
    action: CA,
    name: keyof S,
    callback?: dispatchCallback<CS>
  ): void {
    log("INFO", "DISPATCH:", name, action, `with${callback ? "" : "out"} cb`);
    if (callback)
      props.callbackQueue.push([name, callback as dispatchCallback<unknown>]);
    let errorWhileDispatching = false;
    if (!props.reducers.has(name))
      log("WARN", `reducer ${String(name)} not registered`);
    try {
      const pendingState = (
        props.reducers.get(name) as reducer<unknown, unknown>
      )(action, props.pendingStoreState[name]);
      if (props.pendingStoreState[name] === pendingState) return;
      props.pendingStoreState[name] = pendingState as S[keyof S];
    } catch (err) {
      errorWhileDispatching = true;
      log("WARN", "Ignored error while dispatching");
      log("DEBUG", "ERROR MESSAGE:", err);
    }
    if (props.delayed || (errorWhileDispatching && !callback)) return;
    props.delayed = true;
    setTimeout(() => {
      props.delayed = false;
      refresh();
    }, 0);
  }

  function extendDispatch<CA, CS>(
    defaultName: keyof S
  ): extendedDispatch<CA, CS> {
    return (
      action: CA,
      name?: keyof S,
      callback?: dispatchCallback<CS>
    ): void => {
      dispatch<CA, CS>(action, name || defaultName, callback);
    };
  }

  function _checkEffects(): void {
    props.effects.forEach((effectResult, name) => {
      if (props.pendingEffects.has(name)) return;
      props.effects.delete(name);
      if (typeof effectResult === "function") effectResult();
    });
    props.pendingEffects.clear();
  }

  function useEffect(
    name: key,
    effect: () => void | (() => void),
    options: { delay?: boolean } = {}
  ): void {
    const { delay } = options;
    if (!props.callingSubscriptions) {
      console.warn("useEffect called outside render loop, ignoring call.");
      return;
    }
    props.pendingEffects.add(name);
    if (props.effects.has(name)) return;
    if (delay)
      props.callbackQueue.push([
        undefined,
        () => props.effects.set(name, effect()),
      ]);
    else props.effects.set(name, effect());
  }

  return {
    useEffect,
    register,
    useReducer,
    extendDispatch,
    dispatch,
    getState,
    getPendingState,
    getOptions,
    subscribe,
    refresh,
  };
}
