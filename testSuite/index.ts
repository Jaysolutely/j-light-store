import { Store, StoreOptions } from "../src";
import { render, TemplateResult } from "lit-html";
import { app } from "./app";

const options: StoreOptions = {
  development: true,
};

document.addEventListener("DOMContentLoaded", () => {
  new Store((store) => render(app(store), document.body), options);
});

export type component = (store: Store) => TemplateResult;
