import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Form, { ISubmitEvent } from "react-jsonschema-form";
import config from "../config";
import { JSONSchema6 } from "json-schema";
import * as css from "./authoring.scss";

interface IProps extends IBaseProps {}
interface IState { }
interface QueryParams {
  [key: string]: string;
}

const ignoreConfig = ["season", "authoring"];

const keyTitleFormatter = ((key: string) => {
  let result = key;
  const upperKey = key.charAt(0).toUpperCase() + key.slice(1);
  const parts = upperKey.match(/[A-Z][a-z]+|[0-9]+/g);
  result = parts ? parts.join(" ") : key;
  result = result.replace("Sys ", "System ");
  result = result.replace("Sst ", "Sea Surface Temperature ");
  return result;
});

const defaultValues = () => {
  const configValues: any = {};
  const settings: any = configSettings();
  Object.keys(settings).map(key => {
    configValues[key] = settings[key].value;
  });
  return configValues;
};

const configSettings = () => {
  const configurableSettings: any = {};
  Object.keys(config).map(key => {
    if (ignoreConfig.indexOf(key) === -1  && typeof(config[key]) !== "object") {
      configurableSettings[key] = {
        title: keyTitleFormatter(key),
        type: typeof (config[key]),
        value: config[key]
      };
    }
  });
  return configurableSettings;
};

const schema: JSONSchema6 = {
  title: "Hurricane Model Parameters",
  type: "object",
  properties: {
    season: {
      title: "Season",
      type: "string",
      enum: [
        "spring",
        "summer",
        "fall",
        "winter"
      ]
    },
    ...configSettings()
  }
};

export const defaultAuthoring = {
  season: "fall",
  ...defaultValues()
};

const uiSchema = {
};

export class Authoring extends BaseComponent<IProps, IState> {
  public render() {
    const onSubmit = (e: ISubmitEvent<QueryParams>) => {
      const params = Object.keys(e.formData)
        .filter(key => e.formData[key] !== defaultValues()[key])
        .map(key => {
          return encodeURIComponent(key) + "=" + encodeURIComponent(e.formData[key]);
      }).join("&");
      window.open(`${location.origin}${location.pathname}?${params}`, "hurricane-model");
    };
    return (
      <div className={css.authoring}>
        <Form
          schema={schema}
          formData={defaultAuthoring}
          uiSchema={uiSchema}
          onSubmit={onSubmit} />
      </div>
    );
  }
}
