import { render } from "@testing-library/react";
import React from "react";

import { CategorySparkline } from "./category-sparkline";

describe("CategorySparkline", () => {
  it("renders a polyline point per series value", () => {
    const { container } = render(<CategorySparkline series={[0, 1, 2, 3]} runId="run-1" widthPx={80} />);
    const polyline = container.querySelector("polyline");
    expect(polyline?.getAttribute("points")?.split(" ").length).toBe(4);
  });

  it("colors each gradient stop by its point's category", () => {
    const { container } = render(<CategorySparkline series={[0, 5]} runId="run-1" widthPx={80} />);
    const stops = [...container.querySelectorAll("linearGradient stop")].map(s => s.getAttribute("stop-color"));
    expect(new Set(stops).size).toBeGreaterThan(1);
  });

  it("renders unique gradient ids for two sparklines of the same run", () => {
    const { container } = render(
      <>
        <CategorySparkline series={[0, 1]} runId="run-1" widthPx={80} />
        <CategorySparkline series={[0, 1]} runId="run-1" widthPx={80} />
      </>
    );
    const ids = [...container.querySelectorAll("linearGradient")].map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
