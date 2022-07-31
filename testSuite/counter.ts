import { html } from "lit-html";
import { component } from ".";
import { reducer } from "../src";

export interface CounterState {
  value: number;
}
export interface CounterAction {
  type: "inc" | "dec";
  value?: number;
}

const initialState: CounterState = {
  value: 0,
};

const reducer: reducer<CounterAction, CounterState> = (action, state) => {
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

export const counter: component = (store) => {
  const [state, dispatch] = store.useReducer<CounterAction, CounterState>(
    "counter",
    reducer,
    initialState
  );
  store.useEffect("counter", () => {
    console.log("Counter mounted")
    return () => console.log("Counter unmounted");
  });
  return html`
    <h2>${state.value}</h2>
    <button @click=${() => dispatch({ type: "inc" })}>+ 1</button>
    <button @click=${() => dispatch({ type: "inc", value: 5 })}>+ 5</button>
    <button @click=${() => dispatch({ type: "dec", value: 5 })}>- 5</button>
    <button @click=${() => dispatch({ type: "dec" })}>- 1</button>
  `;
};
