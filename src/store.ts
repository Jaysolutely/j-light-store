import {
  key,
  reducer,
  subscription,
  StoreOptions,
  dispatchCallback,
  extendedDispatch,
} from "./types";

export class Store<S extends Record<key, unknown> = Record<key, unknown>> {
  private _currentStoreState;
  private _pendingStoreState;
  private _reducers: Record<key, reducer<unknown, unknown>> = {};
  private _subscriptions: subscription<S>[] = [];
  private _options: StoreOptions;
  private _callbackQueue: [key | undefined, dispatchCallback<unknown>][] = [];
  private _delayed = false;
  private _effects: Record<key, void | (() => void)> = {};
  private _pendingEffects: Set<key> = new Set();
  private _callingSubscriptions = false;

  constructor(initial: Partial<S>, options: StoreOptions = {}) {
    this._currentStoreState = initial;
    this._pendingStoreState = initial;
    this._options = options;
  }

  public get storeState() {
    return this._currentStoreState;
  }

  public get pendingStoreState() {
    return this._pendingStoreState;
  }

  public get options() {
    return this._options;
  }

  public subscribe(subscription: subscription<S>): void {
    if (typeof subscription !== "function")
      throw Error("No subscription method provided");
    this._subscriptions.push(subscription);
  }

  public refresh(): void {
    if (this._options.development) console.log("REFRESHING");
    this._currentStoreState = this._pendingStoreState;
    this._callingSubscriptions = true;
    this._subscriptions.forEach((subscription) => {
      try {
        subscription(this);
      } catch (err) {
        console.log("Ignored error while executing subscriptions");
        if (this._options.development) console.error(err);
      }
    });
    this._callingSubscriptions = false;
    this._checkEffects();
    this._callbackQueue.forEach(([name, callback]) => {
      try {
        callback(name ? this._currentStoreState[name] : undefined);
      } catch (err) {
        console.warn("Ignored error while executing callbacks");
      }
    });
    this._callbackQueue = [];
  }

  public register<CA, CS>(
    name: keyof S,
    reducer: reducer<CA, CS>,
    initialState: CS
  ): void {
    if (name in this._reducers) {
      console.warn(
        `Redundant register call for <${String(name)}> was ignored.`
      );
      return;
    }
    this._reducers[name] = reducer as reducer<unknown, unknown>;
    this._currentStoreState[name] = initialState as S[keyof S];
    this._pendingStoreState[name] = initialState as S[keyof S];
  }

  public useReducer<CA, CS>(
    name: keyof S,
    reducer: reducer<CA, CS>,
    initialState: CS
  ): [CS, extendedDispatch<CA, CS>] {
    if (name in this._reducers)
      return [
        this._currentStoreState[name] as CS,
        this.extendDispatch<CA, CS>(name),
      ];
    this.register(name, reducer, initialState);
    return [initialState, this.extendDispatch<CA, CS>(name)];
  }

  public dispatch<CA, CS>(
    action: CA,
    name: keyof S,
    callback?: dispatchCallback<CS>
  ): void {
    if (this._options.development)
      console.log("DISPATCH:", name, action, `with${callback ? "" : "out"} cb`);
    if (callback)
      this._callbackQueue.push([name, callback as dispatchCallback<unknown>]);
    let errorWhileDispatching = false;
    if (action && name) {
      let pendingState;
      try {
        pendingState = this._reducers[name](
          action,
          this._pendingStoreState[name]
        );
        if (this._pendingStoreState[name] === pendingState) return;
        this._pendingStoreState[name] = pendingState as S[keyof S];
      } catch (err) {
        errorWhileDispatching = true;
        console.log("Ignored error while dispatching");
        if (this._options.development) console.error(err);
      }
    }
    if (this._delayed || (errorWhileDispatching && !callback)) return;
    this._delayed = true;
    setTimeout(() => {
      this._delayed = false;
      this.refresh();
    }, 0);
  }

  public extendDispatch<CA, CS>(
    defaultName: keyof S
  ): extendedDispatch<CA, CS> {
    return (
      action: CA,
      name?: keyof S,
      callback?: dispatchCallback<CS>
    ): void => {
      this.dispatch<CA, CS>(action, name || defaultName, callback);
    };
  }

  private _checkEffects(): void {
    Object.entries(this._effects).forEach(([name, effectResult]) => {
      if (this._pendingEffects.has(name)) return;
      delete this._effects[name];
      if (typeof effectResult === "function") effectResult();
    });
    this._pendingEffects.clear();
  }

  public useEffect(
    name: key,
    effect: () => void | (() => void),
    options: { delay?: boolean } = {}
  ): void {
    const { delay } = options;
    if (!this._callingSubscriptions) {
      console.warn("useEffect called outside render loop, ignoring call.");
      return;
    }
    this._pendingEffects.add(name);
    if (name in this._effects) return;
    if (delay)
      this._callbackQueue.push([
        undefined,
        () => (this._effects[name] = effect()),
      ]);
    else this._effects[name] = effect();
  }
}
