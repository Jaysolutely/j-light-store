import { Store } from "./store";
export interface StoreOptions {
  development?: boolean;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type state = any;
export type StoreState = Record<string, state>;
export interface Action {
  type: string;
}
export type render = (store: Store) => void;
export type dispatchCallback<CS = state> = (state: CS) => void;
export type reducer<CA extends Action = Action, CS = state> = (
  action: CA,
  state: CS
) => CS;
export type extendedDispatch<CA extends Action = Action, CS = state> = (
  action: CA,
  name?: string,
  callback?: dispatchCallback<CS>
) => void;
