import * as React from "react";
import config from "../config";
import {Copyright} from "./copyright";

export class AboutDialogContent extends React.Component {
  public render() {
    const baseMapList = config.enablePopulationMap
                          ? "Satellite, Relief, Street or Population"
                          : "Satellite, Relief or Street";
    return (
      <div>
        <p>
          Meteorologists use models to explore the formation and motion of storms and hurricanes. Use this model to
          explore factors that affect the intensity and track of hurricanes in the Atlantic Ocean such as the location
          and strength of low and high pressure systems and changes in sea surface temperature. This model includes
          base maps and overlays of real-world data that can be used to consider potential risk and impact of
          hurricanes on people and the environment.
        </p>
        <p>Use the Base Maps tab to select a base map: {baseMapList}.</p>
        <p>Adjust the location and intensity of the high and low pressure systems.</p>
        <p>
          Click the play button to see the track of the hurricane. How does the storm track change in strength and
          direction as it interacts with the pressure systems?
        </p>
        <p>Change seasons by clicking the season button. Which seasons produce the highest category hurricanes?</p>
        <p>
          Use the Map Overlays tab to add a data layer showing sea surface temperature, precipitation or storm surge.
          Explore how hurricanes impact communities in their path.
        </p>
        <p>
          Hurricane Explorer was created
          by <a href="https://github.com/pjanik" target="_blank">Piotr Janik</a> from <a href="https://concord.org"
          target="_blank">the Concord Consortium.</a> This <a
          href="https://concord.org/our-work/research-projects/geohazard/" target="_blank">GeoHazard</a> interactive
          was developed under <a href="https://nsf.gov/" target="_blank">National Science Foundation</a> grant
          DRL-1812362.
        </p>
        <Copyright />
      </div>
    );
  }
}
