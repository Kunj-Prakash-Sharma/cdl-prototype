import { describe, expect, it } from "vitest";
import { csvCell, dateIst, dateTimeIst, phoneForScreen, phoneForSheet, toCsv } from "./csv";

/** The UTF-8 byte order mark, written as a code so the source has no invisible character. */
const BOM = String.fromCharCode(0xfeff);

describe("csvCell", () => {
  it("leaves a plain value alone", () => {
    expect(csvCell("Asha Rao")).toBe("Asha Rao");
    expect(csvCell("")).toBe("");
  });

  it("puts a quote in front of anything that could run as a formula in Excel", () => {
    for (const risky of ["=1+1", "+91 98765", "-2+3", "@SUM(A1)", "\tTabbed", "\rReturn"]) {
      expect(csvCell(risky).startsWith("'") || csvCell(risky).startsWith(`"'`)).toBe(true);
    }
    expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(`"'=HYPERLINK(""http://evil"",""click"")"`);
  });

  it("does not touch a minus or equals sign inside a value", () => {
    expect(csvCell("Anne-Marie")).toBe("Anne-Marie");
    expect(csvCell("1.0.0-draft")).toBe("1.0.0-draft");
  });

  it("wraps values with commas, quotes or line breaks and doubles the quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });
});

describe("toCsv", () => {
  it("starts with a byte order mark, uses CRLF and ends with a line break", () => {
    const csv = toCsv(["A", "B"], [["1", "2"]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toBe(`${BOM}A,B\r\n1,2\r\n`);
  });

  it("keeps Indian-script names intact", () => {
    expect(toCsv(["Name"], [["आशा राव"]])).toContain("आशा राव");
  });

  it("writes only the header for no rows", () => {
    expect(toCsv(["A"], [])).toBe(`${BOM}A\r\n`);
  });
});

describe("phone formats", () => {
  it("writes the sheet phone with a digit first and spaces, so Excel keeps it as text it cannot shorten", () => {
    const phone = phoneForSheet("+919876543210");
    expect(phone).toBe("91 98765 43210");
    expect(phone).toMatch(/^\d/);
    expect(phone).toContain(" ");
    expect(csvCell(phone)).toBe(phone); // no formula guard needed, so no quote shows up in the cell
  });

  it("shows the screen phone with the plus", () => {
    expect(phoneForScreen("+919876543210")).toBe("+91 98765 43210");
  });

  it("returns anything else unchanged", () => {
    expect(phoneForSheet("+14155550100")).toBe("+14155550100");
    expect(phoneForScreen("12345")).toBe("12345");
  });
});

describe("dates in Indian time", () => {
  it("formats a UTC time as IST", () => {
    expect(dateTimeIst(new Date("2026-11-05T10:00:00Z"))).toBe("2026-11-05 15:30");
  });

  it("rolls over the day correctly and writes midnight as 00, not 24", () => {
    expect(dateTimeIst(new Date("2026-11-05T19:00:00Z"))).toBe("2026-11-06 00:30");
    expect(dateIst(new Date("2026-11-05T19:00:00Z"))).toBe("2026-11-06");
  });
});
