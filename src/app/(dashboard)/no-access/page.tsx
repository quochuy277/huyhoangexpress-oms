import { ShieldX } from "lucide-react";

export default function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Không có quyền truy cập</h1>
      <p className="text-muted-foreground max-w-md">
        Tài khoản của bạn chưa được cấp quyền truy cập trang này. Vui lòng liên hệ quản trị viên để được hỗ trợ.
      </p>
    </div>
  );
}
