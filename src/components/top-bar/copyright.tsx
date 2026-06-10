import * as React from "react";

export class Copyright extends React.Component {
  public render() {
    return (
      <p style={{ fontSize: "0.8em" }}>
        <b>Copyright © {(new Date()).getFullYear()}</b> <a href="http://concord.org" target="_blank">The Concord
        Consortium</a>.
        All rights reserved. This resource is licensed under
        the <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank">
        Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)</a>.
        Please provide attribution to the Concord Consortium and the URL <a href="https://concord.org" target="_blank">
        https://concord.org</a>. For full licensing details, see <a href="https://concord.org/licensing/"
        target="_blank">concord.org/licensing</a>.
      </p>
    );
  }
}
