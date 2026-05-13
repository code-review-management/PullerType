import { render, screen } from "@testing-library/react";
import Pull from "./page";

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("@/lib/api/queries/usePullQuery", () => ({
  usePullQuery: () => ({
    data: {},
    isPending: false,
    isError: false,
  }),
}));

jest.mock("@/app/(pages)/_components/Divider/Divider", () => ({
  __esModule: true,
  default: () => <div data-testid="divider" />,
}));

jest.mock("./_components/PullBodyDescription/PullBodyDescription", () => ({
  __esModule: true,
  default: () => <div data-testid="pull-body-description" />,
}));

jest.mock("./_components/PullBodyHeader/PullBodyHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="pull-body-header" />,
}));

jest.mock("./_components/StatusSection/StatusSection", () => ({
  __esModule: true,
  default: () => <div data-testid="status-section" />,
}));

jest.mock("./_components/Reviewers/Reviewers", () => ({
  __esModule: true,
  default: () => <div data-testid="reviewers" />,
}));

jest.mock("./_components/Assignees/Assignees", () => ({
  __esModule: true,
  default: () => <div data-testid="assignees" />,
}));

jest.mock("./_components/PRViewTimeline/PRViewTimeline", () => ({
  __esModule: true,
  default: () => <div data-testid="pr-view-timeline" />,
}));

jest.mock("./_components/PRHeader/PRHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="pull-page-content">Pull page</div>,
}));

describe("Pull page", () => {
  it("renders", () => {
    render(<Pull />);
    expect(screen.getByTestId("pull-page-content")).toBeDefined();
  });

  it("renders all child components", () => {
    render(<Pull />);

    expect(screen.getByTestId("pull-body-header")).toBeDefined();
    expect(screen.getByTestId("pull-body-description")).toBeDefined();
    expect(screen.getByTestId("pr-view-timeline")).toBeDefined();
    expect(screen.getAllByTestId("status-section")).toBeDefined();
    expect(screen.getByTestId("reviewers")).toBeDefined();
    expect(screen.getByTestId("assignees")).toBeDefined();
  });
});
