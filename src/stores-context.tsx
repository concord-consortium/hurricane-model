import { createContext, useContext } from "react";
import { IStores } from "./models/stores";

export const StoresContext = createContext<IStores | null>(null);

export const useStores = () => {
  const stores = useContext(StoresContext);
  if (!stores) throw Error("useStores must be used within a StoresContext.");

  return stores;
}
