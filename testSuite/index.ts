import { Store, StoreOptions } from "../src";
import { render, TemplateResult } from "lit-html";
import { app } from "./app";

const options: StoreOptions = {
  development: true,
};

const store = new Store(options);
store.subscribe((storeData) => render(app(storeData), document.body));
store.refresh();

export type component = (store: Store) => TemplateResult;
