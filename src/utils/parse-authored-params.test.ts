import { parseAuthoredUrlParams, validateUrlParams, KNOWN_PARAMETERS } from "./parse-authored-params";

describe("parse-authored-params", () => {
  describe("parseAuthoredUrlParams", () => {
    it("returns empty params for undefined input", () => {
      const result = parseAuthoredUrlParams(undefined);
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({});
      expect(result.errors).toEqual([]);
    });

    it("returns empty params for empty string", () => {
      const result = parseAuthoredUrlParams("");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({});
    });

    it("returns empty params for whitespace-only string", () => {
      const result = parseAuthoredUrlParams("   ");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({});
    });

    it("parses single key=value pair", () => {
      const result = parseAuthoredUrlParams("season=fall");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({ season: "fall" });
    });

    it("parses multiple key=value pairs with &", () => {
      const result = parseAuthoredUrlParams("season=fall&windArrows=true");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({ season: "fall", windArrows: "true" });
    });

    it("parses newline-separated parameters", () => {
      const result = parseAuthoredUrlParams("season=fall\nwindArrows=true");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({ season: "fall", windArrows: "true" });
    });

    it("handles mixed newlines and ampersands", () => {
      const result = parseAuthoredUrlParams("season=fall&startLocation=gulf\nwindArrows=true");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({
        season: "fall",
        startLocation: "gulf",
        windArrows: "true"
      });
    });

    it("trims whitespace from keys and values", () => {
      const result = parseAuthoredUrlParams("  season = fall  ");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({ season: "fall" });
    });

    it("returns true for parameter without equals sign", () => {
      const param = "exists";
      const result = parseAuthoredUrlParams(param);
      expect(result.valid).toBe(true);
      expect(result.params[param]).toBe("true");
    });

    it("returns error for empty key", () => {
      const result = parseAuthoredUrlParams("=value");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Empty key in: \"=value\"");
    });

    it("handles values with equals signs", () => {
      const result = parseAuthoredUrlParams("param=value=with=equals");
      expect(result.valid).toBe(true);
      expect(result.params).toEqual({ param: "value=with=equals" });
    });
  });

  describe("validateUrlParams", () => {
    it("validates known parameters successfully", () => {
      const result = validateUrlParams("season=fall&windArrows=true");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts skipDisclaimer written as a bare switch", () => {
      // The flag is negative precisely so authors can write it with no value.
      const result = validateUrlParams("skipDisclaimer");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns error for unknown parameter", () => {
      const result = validateUrlParams("unknownParam=value");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown parameter: \"unknownParam\"");
    });

    it("returns error for unknown parameter with suggestion when similar exists", () => {
      // "seas" matches "season" because "season" starts with "seas"
      const result = validateUrlParams("seas=fall");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unknown parameter: \"seas\"");
      expect(result.errors[0]).toContain("Did you mean:");
      expect(result.errors[0]).toContain("season");
    });

    it("suggests similar parameters for typos", () => {
      // "windArrow" should suggest "windArrows"
      const result = validateUrlParams("windArrow=true");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Did you mean:");
      expect(result.errors[0]).toContain("windArrows");
    });

    it("validates boolean parameters", () => {
      const validResult = validateUrlParams("windArrows=true");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateUrlParams("windArrows=yes");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0]).toContain("expects true or false");
    });

    it("validates number parameters", () => {
      const validResult = validateUrlParams("timestep=100");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateUrlParams("timestep=abc");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0]).toContain("expects a number");
    });

    it("validates string enum parameters", () => {
      const validResult = validateUrlParams("season=fall");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateUrlParams("season=autumn");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0]).toContain("must be one of");
    });

    it("does not validate descriptive validValues as enumerations", () => {
      // Parameters with descriptive validValues like "positive number" or "0-1"
      // should not be validated as enumerations even if they contain commas
      // timestep has validValues "positive number" - any number should pass
      const result = validateUrlParams("timestep=999");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);

      // seaSurfaceTempOpacity has validValues "0-1" - should accept any number
      const result2 = validateUrlParams("seaSurfaceTempOpacity=0.5");
      expect(result2.valid).toBe(true);
      expect(result2.errors).toEqual([]);
    });
  });

  describe("KNOWN_PARAMETERS", () => {
    it("includes core simulation parameters", () => {
      const names = KNOWN_PARAMETERS.map(p => p.name);
      expect(names).toContain("season");
      expect(names).toContain("startLocation");
    });

    it("includes map parameters", () => {
      const names = KNOWN_PARAMETERS.map(p => p.name);
      expect(names).toContain("map");
      expect(names).toContain("overlay");
    });

    it("includes UI toggle parameters", () => {
      const names = KNOWN_PARAMETERS.map(p => p.name);
      expect(names).toContain("windArrows");
      expect(names).toContain("hurricaneImage");
    });

    it("includes topBarVisible parameter", () => {
      const names = KNOWN_PARAMETERS.map(p => p.name);
      expect(names).toContain("topBarVisible");
      const param = KNOWN_PARAMETERS.find(p => p.name === "topBarVisible");
      expect(param?.type).toBe("boolean");
      expect(param?.description).toContain("top bar");
    });

    it("includes skipDisclaimer parameter", () => {
      const names = KNOWN_PARAMETERS.map(p => p.name);
      expect(names).toContain("skipDisclaimer");
      const param = KNOWN_PARAMETERS.find(p => p.name === "skipDisclaimer");
      expect(param?.type).toBe("boolean");
      expect(param?.description).toContain("disclaimer");
    });

    it("all parameters have required fields", () => {
      KNOWN_PARAMETERS.forEach(param => {
        expect(param.name).toBeDefined();
        expect(param.type).toBeDefined();
        expect(param.description).toBeDefined();
        expect(["string", "boolean", "number", "array"]).toContain(param.type);
      });
    });
  });
});
