# j-light-store

Ultralight store

## Usage

Example with [lit-html](https://github.com/lit/lit/tree/main/packages/lit-html) to render.

```JavaScript
import { Store } from "j-light-store";
import { render, html } from "lit-html";

function reducer(action, state) {
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

function counter(store) {
    const [state, dispatch] = store.useReducer(
        "counter",
        { value: 0 },
        reducer
    );
    return html`
        <h2>${state.value}</h2>
        <button @click=${() => dispatch({ type: "inc" })}>+ 1</button>
        <button @click=${() => dispatch({ type: "inc", value: 5 })}>+ 5</button>
        <button @click=${() => dispatch({ type: "dec", value: 5 })}>- 5</button>
        <button @click=${() => dispatch({ type: "dec" })}>- 1</button>
    `;
};

function app(store) {
    return html`
        <h1>COUNTER!</h1>
        <div>${counter(store)}</div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    new Store((store) => {render(app(store), document.body)});
});
```

## License

MIT, see LICENSE
