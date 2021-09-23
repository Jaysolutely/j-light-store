import { Action, reducer, Store, StoreOptions } from "../index";

const options: StoreOptions = {
  development: true,
};

interface CounterState {
  value: number;
}
interface CounterAction extends Action {
  type: "inc" | "dec";
  value: number;
}

const myReducer: reducer<CounterAction, CounterState> = (action, state) => {
  switch (action.type) {
    case "inc":
      return {
        ...state,
        value: state.value + (action.value || 1),
      };
    case "dec":
      return {
        ...state,
        value: state.value - (action.value || 1),
      };
    default:
      return state;
  }
};

describe("Basic store tests", () => {
  it("The storeState is set up", () => {
    const myStore = new Store(() => undefined, options);
    expect(myStore.storeState).toEqual({});
  });
  const myStore = new Store(() => undefined, options);
  const [state, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    { value: 0 },
    myReducer
  );
  it("Registering substores works", () => {
    expect(state.value).toEqual(0);
  });
  it("Dispatching events in substore works", () =>
    expect(
      new Promise((res) =>
        dispatch({ type: "dec", value: 6 }, undefined, (state) =>
          res(state.value)
        )
      )
    ).resolves.toBe(-6));
  it("Dispatching multiple events in substore works", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "dec", value: 4 });
        dispatch({ type: "inc", value: 13 }, undefined, (state) =>
          res(state.value)
        );
      })
    ).resolves.toBe(3));
});

describe("Store ignores error throwing render methods", () => {
  const getRender = () => {
    let cnt = 0;
    return () => {
      console.log("cnt at", cnt);
      cnt += 1;
      if (cnt % 2 === 0) throw Error("Random error");
    };
  };
  const myStore = new Store(getRender(), options);
  const [, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    { value: 0 },
    myReducer
  );
  it("first dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 5 }, undefined, (state) =>
          res(state.value)
        );
      })
    ).resolves.toBe(5));
  it("second dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "dec", value: 2 }, undefined, (state) =>
          res(state.value)
        );
      })
    ).resolves.toBe(3));
  it("third dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 7 }, undefined, (state) =>
          res(state.value)
        );
      })
    ).resolves.toBe(10));
});

describe("Store handles error throwing reducers", () => {
  const myStore = new Store(() => undefined, options);
  const myErrorReducer: reducer<CounterAction, CounterState> = (
    action,
    state
  ) => {
    throw Error("Error in reducer");
    return state;
  };
  const [, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    { value: 0 },
    myErrorReducer
  );
  it("error inducing dispatch call", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 5 }, undefined, (state) =>
          res(state.value)
        );
      })
    ).resolves.toBe(0));
});
