import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Form, { ISubmitEvent } from "react-jsonschema-form";
import { QueryParams } from "../utilities/url-params";
import config from "../config";
import { JSONSchema6 } from "json-schema";
import * as css from "./authoring.scss";

interface IProps extends IBaseProps {}
interface IState { }

const defaultValues = () => {
  const configurableSettings: any = {};
  Object.keys(config).map(key => {
    if (key !== "season" && key !== "authoring" && typeof(config[key]) !== "object") {
      configurableSettings[key] = config[key];
    }
  });
  return configurableSettings;
};

const configSettings = () => {
  const configurableSettings: any = {};
  Object.keys(config).map(key => {
    if (key !== "season" && key !== "authoring" && typeof(config[key]) !== "object") {
      configurableSettings[key] = {
        title: key,
        type: typeof(config[key])
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
  settings: {
    season: {
      "ui:widget": "textarea"
    }
  }
};

export class Authoring extends BaseComponent<IProps, IState> {
  public render() {
    const onSubmit = (e: ISubmitEvent<QueryParams>) => {
      const params = Object.keys(e.formData).map(key => {
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
