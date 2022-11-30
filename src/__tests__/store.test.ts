import { reducer, createStore, StoreOptions } from "../index";

const options: StoreOptions = { development: true, logLevel: "DEBUG" };

interface CounterState {
  value: number;
}
interface CounterAction {
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
    const myStore = createStore({}, options);
    expect(myStore.getState()).toEqual({});
  });
  const myStore = createStore({}, options);
  const [state, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    myReducer,
    { value: 0 }
  );
  it("Registering substores works", () => {
    expect(state.value).toEqual(0);
  });
  it("Dispatching events in substore works", () =>
    expect(
      new Promise((res) =>
        dispatch({ type: "dec", value: 6 }, (state) => res(state.value))
      )
    ).resolves.toBe(-6));
  it("Dispatching multiple events in substore works", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "dec", value: 4 });
        dispatch({ type: "inc", value: 13 }, (state) => res(state.value));
      })
    ).resolves.toBe(3));
  const [state2, setState2] = myStore.useState("somekey", "hello" as string);
  it("useState initialising", () => {
    expect(state2).toEqual("hello");
  });
  it("useState setting", () =>
    expect(
      new Promise((res) => {
        setState2("mellow", (state) => res(state));
      })
    ).resolves.toBe("mellow"));
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
  const myStore = createStore({}, options);
  myStore.subscribe(getRender());
  const [, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    myReducer,
    { value: 0 }
  );
  it("first dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 5 }, (state) => res(state.value));
      })
    ).resolves.toBe(5));
  it("second dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "dec", value: 2 }, (state) => res(state.value));
      })
    ).resolves.toBe(3));
  it("third dispatch", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 7 }, (state) => res(state.value));
      })
    ).resolves.toBe(10));
});

describe("Store handles error throwing reducers", () => {
  const myStore = createStore({}, options);
  const myErrorReducer: reducer<CounterAction, CounterState> = () => {
    throw Error("Error in reducer");
  };
  const [, dispatch] = myStore.useReducer<CounterAction, CounterState>(
    "counter",
    myErrorReducer,
    { value: 0 }
  );
  it("error inducing dispatch call", () =>
    expect(
      new Promise((res) => {
        dispatch({ type: "inc", value: 5 }, (state) => res(state.value));
      })
    ).resolves.toBe(0));
});
