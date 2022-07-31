import {
  StoreState,
  reducer,
  subscription,
  StoreOptions,
  dispatchCallback,
  extendedDispatch,
} from "./types";

export class Store {
  private _currentStoreState: StoreState = {};
  private _pendingStoreState: StoreState = {};
  private _reducers: Record<string, reducer> = {};
  private _subscriptions: subscription[] = [];
  private _options: StoreOptions;
  private _callbackQueue: [string | undefined, dispatchCallback][] = [];
  private _delayed = false;
  private _effects: Record<string, () => void> = {};
  private _pendingEffects: Set<string> = new Set();
  private _callingSubscriptions = false;

  constructor(options: StoreOptions = {}) {
    this._options = options;
  }

  public get storeState(): StoreState {
    return this._currentStoreState;
  }
  public get pendingStoreState(): StoreState {
    return this._pendingStoreState;
  }
  public get options(): StoreOptions {
    return this._options;
  }

  public subscribe(subscription: subscription) {
    if (!subscription) throw Error("No subscription provided method specified");
    this._subscriptions.push(subscription);
  }

  private _refresh(): void {
    if (this._options.development) console.log("REFRESHING");
    this._currentStoreState = this._pendingStoreState;
    this._callingSubscriptions = true;
    this._subscriptions.forEach((subscription) => {
      try {
        subscription(this)
      } catch (err) {
        console.log("Ignored error while executing subscriptions");
        if (this._options.development) console.error(err);
      }
    });
    this._callingSubscriptions = false;
    this._checkEffects();
    while (this._callbackQueue.length > 0) {
      try {
        const [name, callback] = this._callbackQueue.shift() as [string | undefined, dispatchCallback];
          callback(name ? this._currentStoreState[name] : undefined);
      } catch (err) {
        console.warn("Ignored error while executing callbacks");
      }
    }
  }

  public register<CA, CS>(
    name: string,
    reducer: reducer<CA, CS>,
    initialState: CS
  ) {
    if (name in this._reducers) {
      console.warn(`Redundant register call for <${name}> was ignored.`);
      return;
    }
    this._reducers[name] = reducer as reducer<unknown, unknown>;
    this._currentStoreState[name] = initialState;
    this._pendingStoreState[name] = initialState;
  }

  public useReducer<CA, CS>(
    name: string,
    reducer: reducer<CA, CS>,
    initialState: CS
  ): [CS, extendedDispatch<CA, CS>] {
    if (name in this._reducers)
      return [this._currentStoreState[name] as CS, this._extendDispatch<CA, CS>(name)];
    this.register(name, reducer, initialState);
    return [initialState, this._extendDispatch<CA, CS>(name)];
  }

  public dispatch<CA, CS>(
    action: CA,
    name: string,
    callback?: dispatchCallback<CS>
  ): void {
    if (this._options.development)
      console.log("DISPATCH:", name, action, `with${callback ? "" : "out"} cb`);
    if (callback) this._callbackQueue.push([name, callback as dispatchCallback<unknown>]);
    let errorWhileDispatching = false;
    if (action && name) {
      let pendingState;
      try {
        pendingState = this._reducers[name](
          action,
          this._pendingStoreState[name]
        );
        if (this._pendingStoreState[name] === pendingState) return;
        this._pendingStoreState[name] = pendingState;
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
      this._refresh();
    }, 0);
  }

  private _extendDispatch<CA, CS>(
    defaultName: string
  ): extendedDispatch<CA, CS> {
    return (
      action: CA,
      name?: string,
      callback?: dispatchCallback<CS>
    ): void => {
      this.dispatch<CA, CS>(action, name || defaultName, callback);
    };
  }
  public refresh() {
    this._refresh();
  }

  private _checkEffects() {
    Object.entries(this._effects).forEach(([name, effectResult]) => {
      if (this._pendingEffects.has(name)) return;
      delete this._effects[name];
      if (typeof effectResult === "function") effectResult();
    });
    this._pendingEffects.clear();
  }

  public useEffect(name: string, effect: () => (() => void | void), options: { delay?: boolean } = {}) {
    const { delay } = options;
    if (!this._callingSubscriptions) {
      console.warn("useEffect called outside render loop, ignoring call.");
      return;
    }
    this._pendingEffects.add(name);
    if (name in this._effects) return;
    const callback = effect();
    if(!callback) return;
    if (delay) this._callbackQueue.push([undefined, () => (this._effects[name] = effect())]);
    else this._effects[name] = effect();
  }
}
