import {
  StoreState,
  reducer,
  render,
  StoreOptions,
  dispatchCallback,
  Action,
  extendedDispatch,
  state,
} from "./types";

export class Store {
  private _currentStoreState: StoreState = {};
  private _pendingStoreState: StoreState = {};
  private _reducers: Record<string, reducer> = {};
  private _render: render;
  private _options: StoreOptions;
  private _callbackQueue: [string, dispatchCallback][] = [];
  private _delayed = false;

  constructor(render: render, options: StoreOptions = {}) {
    if (!render) throw Error("No render method specified");
    this._render = render;
    this._options = options;
    this._refresh();
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

  private _refresh(): void {
    if (this._options.development) console.log("REFRESHING");
    this._currentStoreState = this._pendingStoreState;
    try {
      this._render(this);
    } catch (err) {
      console.log("Ignored error while rendering");
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

  public register(name: string, initialState?: state, reducer?: reducer): void {
    if (name in this._currentStoreState || name in this._reducers) {
      console.warn(`Redundant register call for <${name}> was ignored.`);
      return;
    }
    if (initialState) {
      this._currentStoreState[name] = initialState;
      this._pendingStoreState[name] = initialState;
    }
    if (reducer) this._reducers[name] = reducer;
  }

  public useReducer<CA extends Action = Action, CS = state>(
    name: string,
    initialState: CS,
    reducer: reducer<CA, CS>
  ): [CS, extendedDispatch<CA, CS>] {
    if (name in this._currentStoreState)
      return [this._currentStoreState[name], this.extendDispatch<CA, CS>(name)];
    this.register(name, initialState, reducer as reducer);
    return [initialState, this.extendDispatch<CA, CS>(name)];
  }

  public dispatch<CS = state>(
    action: Action,
    name: string,
    callback?: dispatchCallback<CS>
  ): void {
    if (this._options.development)
      console.log("DISPATCH:", name, action, `with${callback ? "" : "out"} cb`);
    if (callback) this._callbackQueue.push([name, callback]);
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

  public extendDispatch<CA extends Action = Action, CS = state>(
    defaultName: string
  ): extendedDispatch<CA, CS> {
    return (
      action: CA,
      name?: string,
      callback?: dispatchCallback<CS>
    ): void => {
      this.dispatch<CS>(action as Action, name || defaultName, callback);
    };
  }
}
