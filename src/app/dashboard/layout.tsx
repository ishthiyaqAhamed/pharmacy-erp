import Link from "next/link";
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
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white flex flex-col justify-between">
        <div>
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white text-sm font-bold">
                P
              </div>
              <div>
                <p className="text-sm font-bold text-black">Pharmacy ERP</p>
                <p className="text-[11px] text-zinc-500">
                  {session.user.name} · {session.user.role}
                </p>
              </div>
            </div>
          </div>

          <nav className="px-3 py-4 space-y-1">
            <Link
              href="/dashboard"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/medicines"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors"
            >
              Inventory
            </Link>
            <Link
              href="/dashboard/sales"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors"
            >
              Sales
            </Link>
            <Link
              href="/dashboard/sales/new"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors"
            >
              New Sale
            </Link>
          </nav>
        </div>

        <div className="border-t border-zinc-200 px-3 py-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-zinc-50 p-6">{children}</main>
    </div>
  );
}