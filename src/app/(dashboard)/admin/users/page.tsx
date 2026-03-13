import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quản Lý Nhân Viên" };

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
  VIEWER: "Xem",
} as const;

const ROLE_BADGE = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  STAFF: "bg-blue-100 text-blue-700",
  VIEWER: "bg-gray-100 text-gray-600",
} as const;

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      position: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản Lý Nhân Viên</h1>
          <p className="text-slate-500 text-sm mt-1">
            {users.length} nhân viên trong hệ thống
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Thêm nhân viên
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-600">
                Nhân viên
              </th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">
                Phòng ban
              </th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">
                Vai trò
              </th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">
                Trạng thái
              </th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">
                Ngày tạo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-slate-400 text-xs">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-700">{user.department ?? "—"}</p>
                  <p className="text-slate-400 text-xs">{user.position ?? ""}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role]}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.isActive ? "bg-green-500" : "bg-slate-400"
                      }`}
                    />
                    {user.isActive ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Chưa có nhân viên nào
          </div>
        )}
      </div>
    </div>
  );
}
