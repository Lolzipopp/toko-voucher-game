import { redirect } from "next/navigation";

export default function CheckOrderPage() {
  redirect("/akun/login?next=/akun");
}
