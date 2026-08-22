import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "../App";
import { expect, test } from "vitest";

test("renders the Dayflow login screen", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Dayflow" })).toBeInTheDocument();
  expect(screen.getByText("Every workday, perfectly aligned.")).toBeInTheDocument();
});
