import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Welcome, {session?.user.name}
      </h1>
      <p className="text-sm text-slate-500">
        You're logged in as {session?.user.role}.
      </p>
    </div>
  );
}