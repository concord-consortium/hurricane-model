import * as React from "react";

export class Copyright extends React.Component {
  public render() {
    return (
      <p style={{ fontSize: "0.8em" }}>
        <b>Copyright © {(new Date()).getFullYear()}</b> <a href="http://concord.org" target="_blank">The Concord
        Consortium</a>.
        All rights reserved. The software is licensed under
        the <a href="https://github.com/concord-consortium/tectonic-explorer/blob/master/LICENSE"
               target="_blank">MIT</a> license.
        The content is licensed under a <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative
        Commons Attribution 4.0 International License</a>.
        Please provide attribution to the Concord Consortium and the URL <a href="http://concord.org"
                                                                            target="_blank">http://concord.org</a>.
      </p>
    );
  }
}
