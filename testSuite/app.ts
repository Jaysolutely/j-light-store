import { html } from "lit-html";
import { Store, reducer } from "../src";
import { counter } from "./counter";

interface AppAction {
  type: "mount" | "umount";
}
interface AppState {
  counterMounted: boolean;
}
const initialState: AppState = {
  counterMounted: true,
};

const reducer = (action: AppAction, state: AppState) => {
  switch (action.type) {
    case "mount":
      return {
        ...state,
        counterMounted: true,
      };
    case "umount":
      return {
        ...state,
        counterMounted: false,
      };
    default:
      return state;
  }
};

export function app(store: Store) {
  const [state, dispatch] = store.useReducer("app", reducer, initialState);
  return html`
    <h1>HELLO WORLD</h1>
    <div>${state.counterMounted ? counter(store) : ""}</div>
    <br />
    <p>Check console to check mounting and unmounting via useEffect!</p>
    <button @click=${() => dispatch({ type: "mount" })}>mount counter</button>
    <button @click=${() => dispatch({ type: "umount" })}>
      unmount counter
    </button>
  `;
}
