import { html, TemplateResult } from "lit-html";
import { Store } from "../src";
import { counter } from "./counter";

export function app(store: Store): TemplateResult {
  return html`
    <h1>HELLO WORLD</h1>
    <div>${counter(store)}</div>
  `;
}
