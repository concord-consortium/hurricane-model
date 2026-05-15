import * as React from "react";
import {Copyright} from "./copyright";

const getURL = () => {
  return window.location.href;
};

const getIframeString = () => {
  return `<iframe width='1000px' height='800px' frameborder='no' scrolling='no' ` +
         `allowfullscreen='true' src='${getURL()}'></iframe>`;
};

export class ShareDialogContent extends React.Component {
  public render() {
    return (
      <div>
        <p>
          Paste this link in email or IM.
          <textarea id="page-url" style={{ width: "100%" }} value={getURL()} readOnly={true} />
        </p>
        <p>
          Paste HTML to embed in website or blog.
          <textarea id="iframe-string" style={{ width: "100%" }} value={getIframeString()} readOnly={true} />
        </p>
        <Copyright/>
      </div>
    );
  }
}
