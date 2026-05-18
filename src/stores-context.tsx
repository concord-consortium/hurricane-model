import { createContext, useContext } from "react";
import { IStores } from "./models/stores";

export const StoresContext = createContext<IStores | null>(null);

export const useStores = () => useContext(StoresContext);
