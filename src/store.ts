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
  private _callbackQueue: [string, dispatchCallback][] = [];
  private _delayed = false;

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
    try {
      this._subscriptions.forEach((subscription) => subscription(this));
    } catch (err) {
      console.log("Ignored error while executing subscriptions");
      if (this._options.development) console.error(err);
    }
    while (this._callbackQueue.length > 0) {
      try {
        const [name, callback] = this._callbackQueue.shift() as [
          string,
          dispatchCallback
        ];
        callback(this._currentStoreState[name]);
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
      return [this._currentStoreState[name] as CS, this.extendDispatch<CA, CS>(name)];
    this.register(name, reducer , initialState);
    return [initialState, this.extendDispatch<CA, CS>(name)];
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

  public extendDispatch<CA, CS>(
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
}
