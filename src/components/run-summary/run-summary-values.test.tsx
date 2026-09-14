import { render, screen } from "@testing-library/react";
import React from "react";

import { defaultSimulationState } from "../../models/simulation-serialization";
import { createStores, IStores } from "../../models/stores";
import { StoresContext } from "../../stores-context";
import { INormalizedSimulationState, IRunState } from "../../types/interactive-state";
import {
  CategoryOverTimeValue, LandfallValue, PeakCategoryValue, PressureSystemsValue, SeaSurfaceTempValue,
  SeasonValue, StartLocationValue, StartingCategoryValue
} from "./run-summary-values";

type ValueComponent = React.ComponentType<{ run: IRunState; maxSparklineWidth?: number }>;

const setupSim = (customize?: (sim: INormalizedSimulationState) => void) => {
  const sim = defaultSimulationState();
  sim.startLocation = { lat: 10.5, lng: -20 };
  sim.season = "fall";
  sim.hurricane.startingCategory = 3;
  customize?.(sim);
  return sim;
};

const completedSim = () => {
  const sim = defaultSimulationState();
  sim.simulationStarted = true;
  sim.simulationFinished = true;
  sim.time = 100;
  sim.hurricaneTrack = [
    { position: { lat: 20, lng: -40 }, category: 1 },
    { position: { lat: 22, lng: -42 }, category: 3 }
  ];
  sim.landfalls = [{ position: { lat: 22, lng: -42 }, category: 3 }];
  return sim;
};

const renderValue = (stores: IStores, Value: ValueComponent, simulation: INormalizedSimulationState,
  maxSparklineWidth?: number) => {
  stores.runs.setRuns([{ id: "run-1", simulation }], "run-1");
  return render(
    <StoresContext value={stores}>
      <span data-test="value"><Value run={stores.runs.runs[0]} maxSparklineWidth={maxSparklineWidth} /></span>
    </StoresContext>
  );
};

describe("run summary values", () => {
  let stores: IStores;

  beforeEach(() => {
    stores = createStores();
  });

  describe("StartLocationValue", () => {
    it("shows the start location as lat/lng", () => {
      renderValue(stores, StartLocationValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("10.50°N, 20.00°W");
    });

    it("resolves a named start location to its coordinates", () => {
      renderValue(stores, StartLocationValue, setupSim(sim => { sim.startLocation = "gulf"; }));
      expect(screen.getByTestId("value")).toHaveTextContent("23.50°N");
    });
  });

  describe("StartingCategoryValue", () => {
    it("shows the starting category with a category-colored icon", () => {
      renderValue(stores, StartingCategoryValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).toHaveClass("category3");
    });

    it("omits the icon when asked", () => {
      stores.runs.setRuns([{ id: "run-1", simulation: setupSim() }], "run-1");
      render(
        <StoresContext value={stores}>
          <span data-test="value"><StartingCategoryValue run={stores.runs.runs[0]} showIcon={false} /></span>
        </StoresContext>
      );
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).not.toBeInTheDocument();
    });

    it("shows TS when the category is 0 or missing", () => {
      renderValue(stores, StartingCategoryValue, setupSim(sim => { sim.hurricane.startingCategory = 0; }));
      expect(screen.getByTestId("value")).toHaveTextContent("TS");

      renderValue(stores, StartingCategoryValue, setupSim(sim => { delete sim.hurricane.startingCategory; }));
      expect(screen.getAllByTestId("value")[1]).toHaveTextContent("TS");
    });
  });

  describe("SeasonValue", () => {
    it("shows the season label", () => {
      renderValue(stores, SeasonValue, setupSim(sim => { sim.season = "earlyFall"; }));
      expect(screen.getByTestId("value")).toHaveTextContent("Early Fall");
    });
  });

  describe("SeaSurfaceTempValue", () => {
    it("shows Baseline when no anomalies are set", () => {
      renderValue(stores, SeaSurfaceTempValue, setupSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Baseline");
    });

    it("lists each nonzero anomaly with its region and signed value", () => {
      renderValue(stores, SeaSurfaceTempValue, setupSim(sim => {
        sim.temperatureAnomalies = { ...sim.temperatureAnomalies, caribbean: 1, centralAtlantic: -2 };
      }));
      const value = screen.getByTestId("value");
      expect(value).toHaveTextContent("Caribbean +1 °C");
      expect(value).toHaveTextContent("C. Atlantic −2 °C");
      expect(value).not.toHaveTextContent("Baseline");
    });
  });

  describe("PressureSystemsValue", () => {
    it("lists each setup pressure system with its label, position, and mb value", () => {
      renderValue(stores, PressureSystemsValue, setupSim(sim => {
        sim.pressureSystems = sim.pressureSystems.map(ps => ({ ...ps, strength: 3 }));
      }));
      const value = screen.getByTestId("value");
      expect(value).toHaveTextContent("H1: Default, 1023 mb");
      expect(value).toHaveTextContent("L2: Default, 1007 mb");
    });
  });

  describe("PeakCategoryValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, PeakCategoryValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("shows the peak category", () => {
      renderValue(stores, PeakCategoryValue, completedSim());
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).toHaveClass("category3");
    });

    it("omits the icon when asked", () => {
      stores.runs.setRuns([{ id: "run-1", simulation: completedSim() }], "run-1");
      render(
        <StoresContext value={stores}>
          <span data-test="value"><PeakCategoryValue run={stores.runs.runs[0]} showIcon={false} /></span>
        </StoresContext>
      );
      expect(screen.getByTestId("value")).toHaveTextContent("Cat 3");
      expect(screen.getByTestId("value").querySelector("svg")).not.toBeInTheDocument();
    });
  });

  describe("LandfallValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, LandfallValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("shows the landfall count", () => {
      renderValue(stores, LandfallValue, completedSim());
      expect(screen.getByTestId("value")).toHaveTextContent("1×");
    });

    it("shows None when there were no landfalls", () => {
      const sim = completedSim();
      sim.landfalls = [];
      renderValue(stores, LandfallValue, sim);
      expect(screen.getByTestId("value")).toHaveTextContent("None");
    });
  });

  describe("CategoryOverTimeValue", () => {
    it("shows a dash before the run completes", () => {
      renderValue(stores, CategoryOverTimeValue, defaultSimulationState());
      expect(screen.getByTestId("value")).toHaveTextContent("—");
    });

    it("renders the sparkline for a completed run", () => {
      renderValue(stores, CategoryOverTimeValue, completedSim());
      expect(screen.getByTestId("value").querySelector("polyline")).toBeInTheDocument();
    });

    it("fills the given width for the longest run", () => {
      renderValue(stores, CategoryOverTimeValue, completedSim(), 100);
      expect(screen.getByTestId("value").querySelector("svg")).toHaveAttribute("width", "100");
    });

    it("scales shorter runs by duration", () => {
      const longer = completedSim();
      const shorter = completedSim();
      shorter.time = 50;
      stores.runs.setRuns([{ id: "run-1", simulation: longer }, { id: "run-2", simulation: shorter }], "run-1");
      render(
        <StoresContext value={stores}>
          <span data-test="value"><CategoryOverTimeValue run={stores.runs.runs[1]} maxSparklineWidth={100} /></span>
        </StoresContext>
      );
      expect(screen.getByTestId("value").querySelector("svg")).toHaveAttribute("width", "50");
    });
  });
});
