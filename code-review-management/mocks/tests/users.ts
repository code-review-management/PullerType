import { User } from "@/types/github.types";

export function getDefaultUser(): User {
  return {
    login: "",
    id: 0,
    avatar_url: "",
  };
}

export function getExampleUser1(): User {
  return {
    login: "exampleUser1",
    id: 1,
    avatar_url: "",
  };
}

export function getExampleUser2(): User {
  return {
    login: "exampleUser2",
    id: 2,
    avatar_url: "",
  };
}

export function createExampleUser(username: string, id: number): User {
  return {
    login: username,
    id,
    avatar_url: "",
  };
}
