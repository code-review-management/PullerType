import { createExampleUser } from "@/mocks/tests/users";
import {
  buildAssigneeList,
  buildReviewerList,
  listedUser,
  sortUserList,
} from "../userlist-utils";
import { createExampleReview } from "@/mocks/tests/reviews";

describe("sortUserList", () => {
  const user_abc: listedUser = {
    state: "REQUESTED",
    user: createExampleUser("abc", 1),
  };
  const user_def: listedUser = {
    state: "APPROVED",
    user: createExampleUser("def", 1),
  };
  const user_ghi: listedUser = {
    state: "REQUESTED",
    user: createExampleUser("ghi", 1),
  };
  const user_jkl: listedUser = {
    state: "APPROVED",
    user: createExampleUser("jkl", 1),
  };
  const user_mno: listedUser = {
    state: "CHANGES_REQUESTED",
    user: createExampleUser("mno", 1),
  };
  const user_pqr: listedUser = {
    state: "REQUESTED",
    user: createExampleUser("pqr", 1),
  };

  it("returns an empty array when given no users", () => {
    expect(buildAssigneeList([])).toEqual([]);
  });

  it("returns an array with just one user when given that user", () => {
    expect(sortUserList([user_abc])).toEqual([user_abc]);
  });

  it("sorts an array of users with the same level of prioritization by username", () => {
    expect(sortUserList([user_ghi, user_abc, user_pqr])).toEqual([
      user_abc,
      user_ghi,
      user_pqr,
    ]);

    expect(sortUserList([user_jkl, user_mno, user_def])).toEqual([
      user_def,
      user_jkl,
      user_mno,
    ]);
  });

  it("sorts users with different levels of prioritization first by prioritized states, then by username", () => {
    expect(
      sortUserList([
        user_pqr,
        user_abc,
        user_mno,
        user_def,
        user_ghi,
        user_jkl,
      ]),
    ).toEqual([user_abc, user_ghi, user_pqr, user_def, user_jkl, user_mno]);
  });
});

describe("buildReviewerList", () => {
  const user_abc = createExampleUser("abc", 1);
  const user_def = createExampleUser("def", 2);
  const user_ghi = createExampleUser("ghi", 3);

  const review_abc = createExampleReview(user_abc, 1);
  const review_def = createExampleReview(user_def, 2);
  const review_ghi = createExampleReview(user_ghi, 3);

  it("returns an empty array when given no requested reviewers and no reviews", () => {
    expect(buildReviewerList([], [])).toEqual([]);
  });

  it("returns the requested reviewers as listedUsers, ordered by username, when only given requested reviewers", () => {
    expect(buildReviewerList([user_def, user_abc, user_ghi], [])).toEqual([
      { state: "REQUESTED", user: user_abc },
      { state: "REQUESTED", user: user_def },
      { state: "REQUESTED", user: user_ghi },
    ]);
  });

  it("returns reviewers from reviews as listedUsers, ordered by username, when only given reviews", () => {
    expect(buildReviewerList([], [review_def, review_abc, review_ghi])).toEqual(
      [
        { state: "APPROVED", user: user_abc },
        { state: "APPROVED", user: user_def },
        { state: "APPROVED", user: user_ghi },
      ],
    );
  });

  it("returns a reviewer from the review list only once, using its last given state", () => {
    expect(
      buildReviewerList([], [review_abc, review_def, review_abc, review_abc]),
    ).toEqual([
      { state: "APPROVED", user: user_abc },
      { state: "APPROVED", user: user_def },
    ]);
  });

  it("returns a reviewer with state REQUESTED for a user that is in a requested review and previously reviewed", () => {
    expect(
      buildReviewerList([user_abc], [review_abc, review_def, review_abc]),
    ).toEqual([
      { state: "REQUESTED", user: user_abc },
      { state: "APPROVED", user: user_def },
    ]);
  });

  it("returns REQUESTED users, sorted by username, before users of other states", () => {
    expect(
      buildReviewerList([user_def], [review_ghi, review_def, review_abc]),
    ).toEqual([
      { state: "REQUESTED", user: user_def },
      { state: "APPROVED", user: user_abc },
      { state: "APPROVED", user: user_ghi },
    ]);
  });
});

describe("buildAssigneeList", () => {
  const user_abc = createExampleUser("abc", 1);
  const user_def = createExampleUser("def", 2);
  const user_ghi = createExampleUser("ghi", 3);

  it("returns an empty array when given no assignees", () => {
    expect(buildAssigneeList([])).toEqual([]);
  });

  it("returns the assignees as listedUsers, sorted", () => {
    expect(buildAssigneeList([user_def, user_abc, user_ghi])).toEqual([
      { state: "ASSIGNED", user: user_abc },
      { state: "ASSIGNED", user: user_def },
      { state: "ASSIGNED", user: user_ghi },
    ]);
  });
});
