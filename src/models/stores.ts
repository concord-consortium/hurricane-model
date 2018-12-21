import { UIModel, UIModelType } from "./ui";

export type AppMode = "authed" | "dev" | "test" | "demo" | "qa";

export interface IStores {
  appMode: AppMode;
  ui: UIModelType;
}

export interface ICreateStores {
  appMode?: AppMode;
  ui?: UIModelType;
}

export function createStores(params?: ICreateStores): IStores {
  return {
    appMode: params && params.appMode ? params.appMode : "dev",
    ui: params && params.ui || UIModel.create({})
  };
}
