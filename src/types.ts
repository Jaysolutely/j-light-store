export interface StoreOptions {
  development?: boolean;
}
export type key = string | number | symbol;
export type subscription<S extends Record<key, unknown>> = (
  state?: Partial<S>
) => void;
export type dispatchCallback<CS> = (state: CS) => void;
export type reducer<CA, CS> = (action: CA, state: CS) => CS;
export type extendedDispatch<CA, CS> = (
  action: CA,
  name?: string,
  callback?: dispatchCallback<CS>
) => void;
