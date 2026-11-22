import { render, screen, waitFor } from "@testing-library/react";
import RouteAnnouncer from "../RouteAnnouncer";

let mockCurrentPathname = "/";

jest.mock("next/navigation", () => ({
  usePathname: () => mockCurrentPathname,
}));

describe("RouteAnnouncer", () => {
  beforeEach(() => {
    mockCurrentPathname = "/";
    document.title = "xConfess - Anonymous Confessions";
  });

  it("announces a route change once, updates the title, and leaves focus in place", async () => {
    const focused = document.createElement("button");
    document.body.append(focused);
    focused.focus();

    const { rerender } = render(<RouteAnnouncer />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    mockCurrentPathname = "/settings/account";
    rerender(<RouteAnnouncer />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Account settings");
    });
    expect(document.title).toBe("Account settings | xConfess");
    expect(document.activeElement).toBe(focused);

    rerender(<RouteAnnouncer />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    focused.remove();
  });
});
