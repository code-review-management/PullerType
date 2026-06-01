import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { getDefaultPull } from "@/mocks/tests/pulls";
import StatusSection from "./StatusSection";
import { Status } from "@/app/(pages)/_utils/statusConstants";

function getPullWithStatus(status: string) {
  return { ...getDefaultPull(), mergeable_state: status };
}

jest.mock("../StatusFlagChip/StatusFlagChip", () => ({
  __esModule: true,
  default: ({ status }: { status: Status }) => (
    <div data-testid="status-flag-chip" data-status={status} />
  ),
}));

describe("StatusSection", () => {
  const states = ["clean", "dirty", "blocked", "unstable"];
  const statusMapping: Record<string, string> = {
    clean: "ready",
    dirty: "conflict",
    blocked: "waiting",
    unstable: "failure",
  };
  it.each(states)(
    "renders the correct StatusFlagChip when mergeable_state is %s",
    (state) => {
      const status = statusMapping[state];
      const testPull = getPullWithStatus(state);
      render(<StatusSection pullData={testPull} />);
      expect(screen.getByTestId("status-flag-chip")).toHaveAttribute(
        "data-status",
        status,
      );
    },
  );
});
