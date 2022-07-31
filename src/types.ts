// eslint-disable-file @typescript-eslint/no-explicit-any
import { Store } from "./store";
export interface StoreOptions {
  development?: boolean;
}
export type StoreState = Record<string, unknown>;
export type subscription = (store: Store) => void;
export type dispatchCallback<CS = unknown> = (state?: CS) => void;
export type reducer<CA =  unknown, CS = unknown> = (
  action: CA,
  state: CS
) => CS;
export type extendedDispatch<CA = unknown, CS = unknown> = (
  action: CA,
  name?: string,
  callback?: dispatchCallback<CS>
) => void;
