import {
  key,
  reducer,
  subscription,
  StoreOptions,
  dispatchCallback,
  extendedDispatch,
} from "./types";

interface StoreProperties<S extends Record<key, unknown>> {
  currentStoreState: Partial<S>;
  pendingStoreState: Partial<S>;
  reducers: Record<key, reducer<unknown, unknown>>;
  subscriptions: subscription<S>[];
  options: StoreOptions;
  callbackQueue: [key | undefined, dispatchCallback<unknown>][];
  delayed: boolean;
  effects: Record<key, void | (() => void)>;
  pendingEffects: Set<key>;
  callingSubscriptions: boolean;
}

export function createStore<
  S extends Record<key, unknown> = Record<key, unknown>
>(initial: Partial<S>, options: StoreOptions = {}) {
  const props: StoreProperties<S> = {
    currentStoreState: initial,
    pendingStoreState: initial,
    reducers: {},
    subscriptions: [],
    options,
    callbackQueue: [],
    delayed: false,
    effects: {},
    pendingEffects: new Set(),
    callingSubscriptions: false,
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
    if (typeof subscription !== "function")
      throw Error("No subscription method provided");
    props.subscriptions.push(subscription);
  }

  function refresh(): void {
    if (props.options.development) console.log("REFRESHING");
    props.currentStoreState = props.pendingStoreState;
    props.callingSubscriptions = true;
    props.subscriptions.forEach((subscription) => {
      try {
        subscription(props.currentStoreState);
      } catch (err) {
        console.log("Ignored error while executing subscriptions");
        if (props.options.development) console.error(err);
      }
    });
    props.callingSubscriptions = false;
    _checkEffects();
    props.callbackQueue.forEach(([name, callback]) => {
      try {
        callback(name ? props.currentStoreState[name] : undefined);
      } catch (err) {
        console.warn("Ignored error while executing callbacks");
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
      console.warn(
        `Redundant register call for <${String(name)}> was ignored.`
      );
      return;
    }
    props.reducers[name] = reducer as reducer<unknown, unknown>;
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
    if (props.options.development)
      console.log("DISPATCH:", name, action, `with${callback ? "" : "out"} cb`);
    if (callback)
      props.callbackQueue.push([name, callback as dispatchCallback<unknown>]);
    let errorWhileDispatching = false;
    if (action && name) {
      let pendingState;
      try {
        pendingState = props.reducers[name](
          action,
          props.pendingStoreState[name]
        );
        if (props.pendingStoreState[name] === pendingState) return;
        props.pendingStoreState[name] = pendingState as S[keyof S];
      } catch (err) {
        errorWhileDispatching = true;
        console.log("Ignored error while dispatching");
        if (props.options.development) console.error(err);
      }
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
    Object.entries(props.effects).forEach(([name, effectResult]) => {
      if (props.pendingEffects.has(name)) return;
      delete props.effects[name];
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
    if (name in props.effects) return;
    if (delay)
      props.callbackQueue.push([
        undefined,
        () => (props.effects[name] = effect()),
      ]);
    else props.effects[name] = effect();
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
  };
}
