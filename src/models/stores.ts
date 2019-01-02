import { UIModel, UIModelType } from "./ui";

export interface IStores {
  ui: UIModelType;
}

export interface ICreateStores {
  ui?: UIModelType;
}

export function createStores(params?: ICreateStores): IStores {
  return {
    ui: params && params.ui || UIModel.create({})
  };
}
