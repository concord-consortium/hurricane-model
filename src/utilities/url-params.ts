import { merge } from "lodash";
import { defaultAuthoring } from "../components/authoring";

export interface QueryParams {
  [key: string]: string;
}

let params: any;

try {
  const queryString = location.search.length > 1 ? decodeURIComponent(location.search.substring(1)) : "{}";
  params = merge(defaultAuthoring, JSON.parse(queryString));
} catch (e) {
  params = {
    authoring: false,
    ...defaultAuthoring
  };
}

if (location.search === "?authoring") {
  params.authoring = true;
}

export const urlParams: QueryParams = params;
