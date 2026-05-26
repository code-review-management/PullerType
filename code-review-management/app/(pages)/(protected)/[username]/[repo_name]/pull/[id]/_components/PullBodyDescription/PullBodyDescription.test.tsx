import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PullBodyDescription from "./PullBodyDescription";
import { ComponentProps } from "react";

const defaultProps: ComponentProps<typeof PullBodyDescription> = {
  username: "test-username",
  createdAt: "test-date",
  description: "test-description",
  avatarUrl: "test-avatar-url",
};

jest.mock("../Subheader/Subheader", () => ({
  __esModule: true,
  default: () => <div data-testid="subheader" />,
}));

jest.mock("../PRViewComment/PRViewComment", () => ({
  __esModule: true,
  default: ({
    username,
    createdAt,
    description,
    avatarUrl,
  }: {
    username: string;
    createdAt: string;
    description: string;
    avatarUrl?: string;
  }) => (
    <div
      data-testid="pr-view-comment"
      data-avatar-url={avatarUrl}
      data-created-at={createdAt}
      data-description={description}
      data-username={username}
    />
  ),
}));

describe("PullBodyDescription", () => {
  it("renders a subheader for the section", () => {
    render(<PullBodyDescription {...defaultProps} />);
    expect(screen.getByTestId("subheader")).toBeInTheDocument();
  });

  it("renders given username, createdAt, description, and avatarUrl in a PRViewComment", () => {
    render(<PullBodyDescription {...defaultProps} />);
    expect(screen.getByTestId("pr-view-comment")).toBeInTheDocument();
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-avatar-url",
      "test-avatar-url",
    );
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-created-at",
      "test-date",
    );
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "test-description",
    );
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-username",
      "test-username",
    );
  });
});
