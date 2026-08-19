import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">Pharmacy ERP</p>
          <p className="text-xs text-slate-500">
            {session.user.name} · {session.user.role}
          </p>
        </div>

        <nav className="px-3 py-4">
          <a href="/dashboard" className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Overview
          </a>
        </nav>

        <div className="px-3 py-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 p-6">{children}</main>
    </div>
  );
}