import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAdminToggle } from "./user-admin-toggle";
import { CreateAdminDialog } from "./create-admin-dialog";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">
            Promote an existing founder to admin, or create a new admin
            login directly — no email verification required either way.
          </p>
        </div>
        <CreateAdminDialog />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load users: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {profiles?.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="text-sm font-medium text-slate-900">
                  {profile.full_name || "—"}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {profile.email}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Date(profile.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <UserAdminToggle
                    userId={profile.id}
                    isAdmin={profile.is_admin}
                    isSelf={profile.id === currentUser?.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
