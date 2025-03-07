import {
  getOptional,
  getOptionalBool,
  getRequired,
  getRequiredWithFallback,
  getTransformedOptional,
} from ".";

describe("env", () => {
  afterEach(() => {
    delete process.env.VERSION;
  });

  describe("getRequiredWithFallback", () => {
    it("should return from environment", () => {
      process.env.VERSION = "a good variable value";
      expect(getRequiredWithFallback("VERSION", "WHATEVER")).toEqual("a good variable value");
    });
    it("throw error if not on environment", () => {
      expect(() => getRequiredWithFallback("VERSION", "WHATEVER")).toThrow(
        `One of ${"VERSION"}, WHATEVER should be set on the environment`
      );
    });
    it("should return from environment when fallback", () => {
      process.env.VERSION = "a good variable value";
      expect(getRequiredWithFallback("WHATEVER", "VERSION")).toEqual("a good variable value");
    });
    it("throw error if not on environment", () => {
      expect(() => getRequiredWithFallback("WHATEVER", "VERSION")).toThrow(
        `One of WHATEVER, ${"VERSION"} should be set on the environment`
      );
    });
  });

  describe("getRequired", () => {
    it("should return from environment", () => {
      process.env.VERSION = "a good variable value";
      expect(getRequired("VERSION")).toEqual("a good variable value");
    });
    it("throw error if not on environment", () => {
      expect(() => getRequired("VERSION")).toThrow(`${"VERSION"} should be set on the environment`);
    });
  });

  describe("getOptional", () => {
    const defaultValue = "wet bandits";

    it("should return default value when provided", () => {
      expect(getOptional("VERSION", "a different value")).toEqual("a different value");
    });

    it("should return undefined when not provided", () => {
      expect(getOptional("VERSION")).toEqual(undefined);
    });

    it("should return transformed value when provided", () => {
      process.env.VERSION = "meow!";
      const result = getOptional("VERSION", defaultValue);
      expect(result).toEqual("meow!");
    });

    it("should still return empty provided value", () => {
      process.env.VERSION = "";
      const result = getOptional("VERSION", defaultValue);
      expect(result).toEqual("");
    });

    it("should return the default value when environment variable not provided", () => {
      const result = getOptional("VERSION", defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe("getTransformedOptional", () => {
    const transformer = (value: string) => value.length;
    const defaultValue = 603;

    it("should return transformed value when provided", () => {
      process.env.VERSION = "meow!";
      expect(getTransformedOptional("VERSION", transformer)).toEqual(5);
    });

    it("should still transform empty provided value", () => {
      process.env.VERSION = "";
      expect(getTransformedOptional("VERSION", transformer)).toEqual(0);
    });

    it("should return undefined when not provided", () => {
      expect(getTransformedOptional("VERSION", transformer)).toEqual(undefined);
    });

    it("should return transformed value when provided", () => {
      process.env.VERSION = "meow!";
      const result = getTransformedOptional("VERSION", transformer, defaultValue);
      expect(result).toEqual(5);
    });

    it("should still transform empty provided value", () => {
      process.env.VERSION = "";
      const result = getTransformedOptional("VERSION", transformer, defaultValue);
      expect(result).toEqual(0);
    });

    it("should return the default value when environment variable not provided", () => {
      const result = getTransformedOptional("VERSION", transformer, defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe("getOptionalBool", () => {
    const trueValues = ["1", "true", "True", "TRUE", "TrUe"];
    trueValues.forEach((value) => {
      it(`should treat ${value} as true`, () => {
        process.env.BOOLISH = value;
        const result = getOptionalBool("BOOLISH");
        expect(result).toBe(true);
      });
    });

    const falseValues = ["0", "false", "False", "garbaj"];

    falseValues.forEach((value) => {
      it(`should treat ${value} as false`, () => {
        process.env.BOOLISH = value;
        const result = getOptionalBool("BOOLISH");
        expect(result).toBe(false);
      });
    });

    it("should treat an unset value as false", () => {
      const result = getOptionalBool("BOOLISH");
      expect(result).toBe(false);
    });
  });
});
