import { redirect } from "next/navigation";

// Köhnə /account linkləri üçün geriyə uyğunluq — auth indi /login və /register-dədir.
export default function AccountRedirect() {
  redirect("/login");
}
