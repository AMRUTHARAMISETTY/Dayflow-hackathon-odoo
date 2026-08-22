import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "../pages/LoginPage";
import { AuthProvider } from "../lib/auth-context";
import { ToastProvider } from "../lib/toast-context";
import * as api from "../lib/api";

describe("LoginPage", () => {
  it("submits credentials and signs the user in", async () => {
    const user = { id: 1, employeeId: 1, employeeCode: "DF-00001", name: "Amrutha Ramisetty", email: "admin@dayflow.test", role: "SUPER_ADMIN", departmentName: "Administration", designation: "Super Administrator", permissions: ["dashboard:read"] };
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue(user);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@dayflow.test" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Dayflow@123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith("admin@dayflow.test", "Dayflow@123", false));
  });

  it("shows the server error message on failed login", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError("Invalid email or password.", 401));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });
});
