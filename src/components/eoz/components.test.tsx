import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const post = vi.fn();
const get = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, api: { ...actual.api, post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } };
});

import { ApiError } from "@/lib/api-client";
import { MfaChallengeForm } from "./MfaChallengeForm";
import { Monogram } from "./Monogram";
import { VersionHistory } from "./VersionHistory";

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe("MfaChallengeForm", () => {
  it("submits the code with the challenge and reports success", async () => {
    const user = { id: "u1", fullName: "Chipo Banda", roles: ["CANDIDATE"] };
    post.mockResolvedValue(user);
    const onSuccess = vi.fn();
    renderWithProviders(<MfaChallengeForm challengeId="c-1" onSuccess={onSuccess} onCancel={() => {}} />);

    const input = screen.getByLabelText(/authentication code/i);
    expect(input).toHaveFocus();
    await userEvent.type(input, "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify and sign in/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith("/auth/mfa/verify", { challengeId: "c-1", code: "123456" });
  });

  it("shows the server's message when the code is wrong", async () => {
    post.mockRejectedValue(new ApiError(400, "That code isn't right."));
    renderWithProviders(<MfaChallengeForm challengeId="c-1" onSuccess={() => {}} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/authentication code/i), "000000");
    await userEvent.click(screen.getByRole("button", { name: /verify and sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right.");
  });

  it("switches to recovery codes and back", async () => {
    const onCancel = vi.fn();
    renderWithProviders(<MfaChallengeForm challengeId="c-1" onSuccess={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /use a recovery code/i }));
    expect(screen.getByLabelText(/recovery code/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("Monogram", () => {
  it("shows up to two initials and is hidden from screen readers", () => {
    const { container } = renderWithProviders(<Monogram name="Copperbelt Energy Corporation" />);
    const tile = container.querySelector("span");
    expect(tile).toHaveTextContent("CE");
    expect(tile).toHaveAttribute("aria-hidden");
  });
});

describe("VersionHistory", () => {
  it("lists versions newest first with the fields that changed", async () => {
    get.mockResolvedValue([
      {
        versionNo: 2,
        status: "PUBLISHED",
        snapshot: { title: "Senior Data Analyst (Lusaka HQ)", status: "PUBLISHED" },
        changedByName: "Ada Mwale",
        createdAt: "2026-09-26T10:00:00Z",
      },
      {
        versionNo: 1,
        status: "PENDING_REVIEW",
        snapshot: { title: "Senior Data Analyst", status: "PENDING_REVIEW" },
        changedByName: "Kondwani Phiri",
        createdAt: "2026-09-25T10:00:00Z",
      },
    ]);
    renderWithProviders(<VersionHistory opportunityId="o-1" />);

    expect(await screen.findByText("v2")).toBeInTheDocument();
    expect(screen.getByText("Senior Data Analyst (Lusaka HQ)")).toBeInTheDocument();
    expect(screen.getByText("Senior Data Analyst")).toHaveClass("line-through");
    expect(screen.getByText("First recorded version.")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/opportunities/manage/o-1/versions");
  });
});
