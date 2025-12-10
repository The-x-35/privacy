declare module '@lightprotocol/hasher.rs' {
  export const WasmFactory: any;
}

declare module '*.wasm' {
  const value: string;
  export default value;
}

