import { renderHook } from "@testing-library/react";
import { useChangesViewMode } from "../useChangesViewMode";

const mockUseSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe("useChangesViewMode", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns pr mode with null sha when no query params are present", () => {
    const mockSearchParams = new URLSearchParams("");
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useChangesViewMode());
    const { sha, mode } = result.current;

    expect(sha).toBe(null);
    expect(mode).toBe("pr");
  });

  it("returns single-commit mode with the sha when only sha param is present", () => {
    const mockSearchParams = new URLSearchParams("sha=test-commit-sha");
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useChangesViewMode());
    const { sha, mode } = result.current;

    expect(sha).toBe("test-commit-sha");
    expect(mode).toBe("single-commit");
  });

  it("returns cumulative-commit mode with the sha when sha and cumulative params are both present", () => {
    const mockSearchParams = new URLSearchParams(
      "sha=test-commit-sha&cumulative=true",
    );
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useChangesViewMode());
    const { sha, mode } = result.current;

    expect(sha).toBe("test-commit-sha");
    expect(mode).toBe("cumulative-commit");
  });

  it("falls back to pr mode when sha param is missing, even if cumulative param is present", () => {
    const mockSearchParams = new URLSearchParams("cumulative=true");
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useChangesViewMode());
    const { sha, mode } = result.current;

    expect(sha).toBe(null);
    expect(mode).toBe("pr");
  });
});
