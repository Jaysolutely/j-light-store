# j-light-store

Ultralight store

## Usage

Example with [lit-html](https://github.com/lit/lit/tree/main/packages/lit-html) to render.

```JavaScript
import { Store } from "j-light-store";
import { render, html } from "lit-html";

function reducer(_, state) {
  return state + 1;
};

const store = new Store();

function counter() {
    const [value, dispatch] = store.useReducer("counter", reducer, 0);
    return html`
        <h2>${value}</h2>
        <button @click=${() => dispatch({})}>+1</button>
    `;
};

function app() {
    return html`
        <h1>COUNTER!</h1>
        <div>${counter()}</div>
    `;
}

store.subscribe(() => render(app(), document.body));
store.refresh();
```

## License

MIT, see LICENSE
