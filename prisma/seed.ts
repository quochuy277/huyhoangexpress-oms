import { PrismaClient, Role, DeliveryStatus, ClaimType, ClaimStatus, TodoStatus, Priority, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================================
  // 1. Create Users
  // ============================================================
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      password: passwordHash,
      name: "Nguyễn Văn Admin",
      role: Role.ADMIN,
      department: "Ban Giám Đốc",
      position: "Quản trị viên",
    },
  });

  const managerHash = await bcrypt.hash("Manager@123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@company.com" },
    update: {},
    create: {
      email: "manager@company.com",
      password: managerHash,
      name: "Trần Thị Manager",
      role: Role.MANAGER,
      department: "Phòng Vận Hành",
      position: "Trưởng phòng",
    },
  });

  const staffHash = await bcrypt.hash("Staff@123", 12);
  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@company.com" },
    update: {},
    create: {
      email: "staff1@company.com",
      password: staffHash,
      name: "Lê Văn Staff1",
      role: Role.STAFF,
      department: "Phòng CSKH",
      position: "Nhân viên CSKH",
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@company.com" },
    update: {},
    create: {
      email: "staff2@company.com",
      password: staffHash,
      name: "Phạm Thị Staff2",
      role: Role.STAFF,
      department: "Phòng CSKH",
      position: "Nhân viên CSKH",
    },
  });

  console.log("✅ Created 4 users");

  // ============================================================
  // 1b. Create Permission Groups
  // ============================================================
  const adminGroup = await prisma.permissionGroup.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Toàn quyền hệ thống",
      isSystemGroup: true,
      canViewOrders: true, canUploadExcel: true, canDeleteOrders: true, canEditStaffNotes: true,
      canViewRevenue: true, canViewCarrierFee: true, canViewFinancePage: true, canViewDashboardFinance: true,
      canViewDelayed: true, canViewReturns: true, canConfirmReturn: true,
      canViewClaims: true, canCreateClaim: true, canUpdateClaim: true,
      canViewAllTodos: true,
      canViewAllAttendance: true, canEditAttendance: true, canScoreEmployees: true,
      canManageUsers: true, canManagePermissions: true,
    },
  });

  const managerGroup = await prisma.permissionGroup.upsert({
    where: { name: "Quản lý" },
    update: {},
    create: {
      name: "Quản lý",
      description: "Quản lý vận hành, không quản trị hệ thống",
      isSystemGroup: true,
      canViewOrders: true, canUploadExcel: true, canDeleteOrders: true, canEditStaffNotes: true,
      canViewRevenue: true, canViewCarrierFee: true, canViewFinancePage: true, canViewDashboardFinance: true,
      canViewDelayed: true, canViewReturns: true, canConfirmReturn: true,
      canViewClaims: true, canCreateClaim: true, canUpdateClaim: true,
      canViewAllTodos: true,
      canViewAllAttendance: true, canEditAttendance: true, canScoreEmployees: true,
      canManageUsers: false, canManagePermissions: false,
    },
  });

  const staffGroup = await prisma.permissionGroup.upsert({
    where: { name: "Nhân viên" },
    update: {},
    create: {
      name: "Nhân viên",
      description: "Nhân viên chăm sóc khách hàng",
      isSystemGroup: true,
      canViewOrders: true, canUploadExcel: true, canDeleteOrders: false, canEditStaffNotes: true,
      canViewRevenue: false, canViewCarrierFee: false, canViewFinancePage: false, canViewDashboardFinance: false,
      canViewDelayed: true, canViewReturns: true, canConfirmReturn: false,
      canViewClaims: true, canCreateClaim: true, canUpdateClaim: false,
      canViewAllTodos: false,
      canViewAllAttendance: false, canEditAttendance: false, canScoreEmployees: false,
      canManageUsers: false, canManagePermissions: false,
    },
  });

  const viewerGroup = await prisma.permissionGroup.upsert({
    where: { name: "Xem" },
    update: {},
    create: {
      name: "Xem",
      description: "Chỉ xem, không thao tác",
      isSystemGroup: true,
      canViewOrders: true, canUploadExcel: false, canDeleteOrders: false, canEditStaffNotes: false,
      canViewRevenue: false, canViewCarrierFee: false, canViewFinancePage: false, canViewDashboardFinance: false,
      canViewDelayed: true, canViewReturns: true, canConfirmReturn: false,
      canViewClaims: true, canCreateClaim: false, canUpdateClaim: false,
      canViewAllTodos: false,
      canViewAllAttendance: false, canEditAttendance: false, canScoreEmployees: false,
      canManageUsers: false, canManagePermissions: false,
    },
  });

  // Assign permission groups to existing users
  await prisma.user.update({ where: { id: admin.id }, data: { permissionGroupId: adminGroup.id } });
  await prisma.user.update({ where: { id: manager.id }, data: { permissionGroupId: managerGroup.id } });
  await prisma.user.update({ where: { id: staff1.id }, data: { permissionGroupId: staffGroup.id } });
  await prisma.user.update({ where: { id: staff2.id }, data: { permissionGroupId: staffGroup.id } });

  console.log("✅ Created 4 permission groups + assigned to users");

  // ============================================================
  // 2. Create 100 Sample Orders
  // ============================================================
  const carriers = ["GHN", "GTK", "BSI", "JAT", "SPX"];
  const shops = [
    "Shop Thời Trang ABC",
    "Mỹ Phẩm XYZ",
    "Điện Tử 123",
    "Shop Giày Dép Online",
    "Phụ Kiện Điện Thoại HN",
    "Shop Đồ Gia Dụng",
    "Thực Phẩm Sạch SG",
    "Shop Đồ Chơi Trẻ Em",
  ];
  const provinces = [
    "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Bình Dương",
    "Đồng Nai", "Long An", "Thanh Hóa", "Nghệ An", "Hải Phòng",
  ];
  const districts = [
    "Quận 1", "Quận 3", "Quận 7", "Quận 12", "Bình Thạnh",
    "Thủ Đức", "Gò Vấp", "Tân Bình", "Hoàng Mai", "Cầu Giấy",
  ];
  const regionGroups = [
    "0.Nội Tỉnh-Nội Huyện",
    "1.Nội Tỉnh-Liên Huyện Gần",
    "2.Nội Tỉnh-Liên Huyện Xa",
    "3.Nội Miền-Thành Phố",
    "4.Nội Miền-Huyện",
    "5.Liên Miền-Thành Phố",
    "6.Liên Miền-Huyện",
  ];
  const statuses: { raw: string; mapped: DeliveryStatus }[] = [
    { raw: "Đang chuyển kho giao", mapped: DeliveryStatus.IN_TRANSIT },
    { raw: "Đang giao hàng", mapped: DeliveryStatus.DELIVERING },
    { raw: "Đã giao hàng", mapped: DeliveryStatus.DELIVERED },
    { raw: "Đã đối soát giao hàng", mapped: DeliveryStatus.RECONCILED },
    { raw: "Hoãn giao hàng", mapped: DeliveryStatus.DELIVERY_DELAYED },
    { raw: "Xác nhận hoàn", mapped: DeliveryStatus.RETURN_CONFIRMED },
    { raw: "Đang chuyển kho trả toàn bộ", mapped: DeliveryStatus.RETURNING_FULL },
    { raw: "Hoãn trả hàng", mapped: DeliveryStatus.RETURN_DELAYED },
    { raw: "Đã trả hàng toàn bộ", mapped: DeliveryStatus.RETURNED_FULL },
    { raw: "Đã trả hàng một phần", mapped: DeliveryStatus.RETURNED_PARTIAL },
  ];

  const delayReasons = [
    "14:30 - 05/03/2026 Hoãn giao hàng vì: Không liên lạc được người nhận",
    "09:00 - 06/03/2026 Hoãn giao hàng vì: Khách hẹn lại ngày giao",
    "16:45 - 07/03/2026 Hoãn giao hàng vì: Từ chối nhận hàng - Không đặt hàng",
    "11:20 - 08/03/2026 Hoãn giao hàng vì: Sai địa chỉ giao hàng",
    "10:00 - 09/03/2026 Hoãn giao hàng vì: Hàng hư hỏng",
  ];

  const names = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thu Dung",
    "Hoàng Minh Đức", "Vũ Thị Hoa", "Đỗ Quang Huy", "Bùi Thanh Lan",
    "Ngô Đình Khoa", "Dương Thị Mai", "Lý Minh Nhật", "Hồ Bảo Phúc",
    "Trương Anh Quân", "Phan Thị Sương", "Đinh Xuân Trường",
  ];

  const salesStaffList = ["Nguyễn Huy", "Trần Hoàng", "Lê Minh", "Phạm Tú"];

  const orders = [];
  for (let i = 1; i <= 100; i++) {
    const statusIdx = Math.floor(Math.random() * statuses.length);
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    const shop = shops[Math.floor(Math.random() * shops.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const region = regionGroups[Math.floor(Math.random() * regionGroups.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const salesStaff = salesStaffList[Math.floor(Math.random() * salesStaffList.length)];
    const codAmount = Math.floor(Math.random() * 5000000);
    const shippingFee = Math.floor(Math.random() * 50000) + 15000;
    const carrierFee = Math.floor(shippingFee * 0.7);

    const createdDaysAgo = Math.floor(Math.random() * 30);
    const createdTime = new Date();
    createdTime.setDate(createdTime.getDate() - createdDaysAgo);

    // Build publicNotes for delayed orders and DELIVERING with delay history
    let publicNotes: string | null = null;
    if (statusIdx === 4 || statusIdx === 7) {
      // DELIVERY_DELAYED or RETURN_DELAYED
      const numDelays = Math.floor(Math.random() * 3) + 1;
      const noteLines: string[] = [];
      for (let d = 0; d < numDelays; d++) {
        noteLines.push(delayReasons[Math.floor(Math.random() * delayReasons.length)]);
      }
      publicNotes = noteLines.join("\n");
    }
    // ~10% of DELIVERING orders get delay history (re-delivery scenario)
    if (statusIdx === 1 && Math.random() < 0.3) {
      publicNotes = delayReasons[Math.floor(Math.random() * delayReasons.length)] +
        "\n16:00 - 10/03/2026 Giao lại lần 2";
    }

    orders.push({
      requestCode: `HHE${String(2026).slice(-2)}${String(i).padStart(6, "0")}`,
      customerOrderCode: `KH${String(i).padStart(8, "0")}`,
      shopName: shop,
      status: statuses[statusIdx].raw,
      deliveryStatus: statuses[statusIdx].mapped,
      carrierName: carrier,
      carrierOrderCode: `${carrier}${String(Math.floor(Math.random() * 999999999)).padStart(9, "0")}`,
      carrierAccount: `${carrier}_HuyHoang`,
      receiverName: name,
      receiverPhone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
      receiverAddress: `${Math.floor(Math.random() * 200) + 1} Đường số ${Math.floor(Math.random() * 50) + 1}`,
      receiverWard: `Phường ${Math.floor(Math.random() * 15) + 1}`,
      receiverDistrict: district,
      receiverProvince: province,
      codAmount,
      codOriginal: codAmount,
      declaredValue: codAmount,
      shippingFee,
      surcharge: Math.floor(Math.random() * 5000),
      overweightFee: 0,
      insuranceFee: Math.floor(codAmount * 0.005),
      codServiceFee: Math.floor(codAmount * 0.01),
      returnFee: 0,
      totalFee: shippingFee + Math.floor(codAmount * 0.015),
      carrierFee,
      ghsvInsuranceFee: 0,
      revenue: (shippingFee + Math.floor(codAmount * 0.015)) - carrierFee,
      createdTime,
      lastUpdated: new Date(),
      regionGroup: region,
      customerWeight: Math.floor(Math.random() * 5000) + 100,
      carrierWeight: Math.floor(Math.random() * 5000) + 100,
      salesStaff,
      orderSource: ["ANDROID", "IOS", "WEB", "PANCAKE"][Math.floor(Math.random() * 4)],
      partialOrderType: "Đơn toàn bộ",
      publicNotes,
      deliveredDate:
        statusIdx === 2 || statusIdx === 3
          ? new Date(createdTime.getTime() + 3 * 24 * 3600 * 1000)
          : null,
    });
  }

  for (const order of orders) {
    await prisma.order.upsert({
      where: { requestCode: order.requestCode },
      update: {},
      create: order,
    });
  }

  console.log("✅ Created 100 sample orders");

  // ============================================================
  // 3. Create 5 Claims
  // ============================================================
  const claimTypes = [ClaimType.LOST, ClaimType.DAMAGED, ClaimType.WRONG_ITEM, ClaimType.SHORTAGE, ClaimType.DELAY];
  const claimDescriptions = [
    "Đơn hàng bị mất trong quá trình vận chuyển",
    "Hàng bị hư hỏng khi giao đến khách",
    "Giao sai sản phẩm cho khách hàng",
    "Thiếu hàng trong kiện - khách chỉ nhận được 2/3 sản phẩm",
    "Giao hàng trễ hơn 7 ngày so với cam kết",
  ];

  for (let i = 0; i < 5; i++) {
    const orderIdx = i * 20; // Pick orders at index 0, 20, 40, 60, 80
    const order = orders[orderIdx];

    await prisma.claimOrder.upsert({
      where: {
        orderId: (await prisma.order.findUnique({ where: { requestCode: order.requestCode } }))!.id,
      },
      update: {},
      create: {
        orderId: (await prisma.order.findUnique({ where: { requestCode: order.requestCode } }))!.id,
        claimType: claimTypes[i],
        claimStatus: i === 0 ? ClaimStatus.PENDING : i === 1 ? ClaimStatus.SUBMITTED : i === 2 ? ClaimStatus.IN_REVIEW : i === 3 ? ClaimStatus.APPROVED : ClaimStatus.COMPENSATED,
        issueDescription: claimDescriptions[i],
        claimAmount: order.codAmount * 0.5,
        compensationAmount: i >= 3 ? order.codAmount * 0.3 : null,
        deadline: new Date(Date.now() + (i - 2) * 24 * 3600 * 1000), // Some overdue, some upcoming
        submittedDate: i >= 1 ? new Date(Date.now() - 5 * 24 * 3600 * 1000) : null,
        resolvedDate: i >= 3 ? new Date() : null,
        createdById: staff1.id,
      },
    });
  }

  console.log("✅ Created 5 claims");

  // ============================================================
  // 4. Create 10 Todo Items
  // ============================================================
  const todoTitles = [
    "Gọi xác nhận đơn hoãn giao lần 3",
    "Liên hệ khách hàng Shop ABC về đơn mất",
    "Đối soát COD tháng 03 với GHN",
    "Cập nhật bảng giá vận chuyển mới",
    "Kiểm tra đơn hoàn về kho ngày 12/03",
    "Gửi báo cáo tuần cho quản lý",
    "Xử lý khiếu nại đơn hư hỏng #HHE260040",
    "Tạo file đối soát BSI tuần 11",
    "Liên hệ shipper về đơn trả hàng chậm",
    "Review đơn hàng lỗi nhập từ file Excel",
  ];

  const todoStatuses = [TodoStatus.TODO, TodoStatus.IN_PROGRESS, TodoStatus.REVIEW, TodoStatus.DONE];
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];

  for (let i = 0; i < 10; i++) {
    await prisma.todoItem.create({
      data: {
        title: todoTitles[i],
        description: `Chi tiết công việc: ${todoTitles[i]}`,
        status: todoStatuses[Math.floor(Math.random() * todoStatuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: new Date(Date.now() + (i - 3) * 24 * 3600 * 1000),
        sortOrder: i,
        assigneeId: i % 2 === 0 ? staff1.id : staff2.id,
      },
    });
  }

  console.log("✅ Created 10 todos");

  // ============================================================
  // 5. Create 7 Days of Attendance
  // ============================================================
  const allStaff = [admin, manager, staff1, staff2];
  for (let day = 6; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    for (const user of allStaff) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) continue;

      const checkIn = new Date(date);
      checkIn.setHours(8 + Math.floor(Math.random() * 1), Math.floor(Math.random() * 30), 0, 0);

      const checkOut = new Date(date);
      checkOut.setHours(17 + Math.floor(Math.random() * 1), Math.floor(Math.random() * 30), 0, 0);

      const totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      await prisma.attendance.upsert({
        where: { userId_date: { userId: user.id, date } },
        update: {},
        create: {
          userId: user.id,
          date,
          checkIn,
          checkOut,
          totalHours: Math.round(totalHours * 100) / 100,
          status: checkIn.getHours() >= 9 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        },
      });
    }
  }

  console.log("✅ Created 7 days of attendance");

  // ============================================================
  // 6. Create Login History
  // ============================================================
  for (const user of allStaff) {
    for (let i = 0; i < 3; i++) {
      const loginTime = new Date();
      loginTime.setDate(loginTime.getDate() - i);
      loginTime.setHours(8, Math.floor(Math.random() * 30), 0, 0);

      const logoutTime = new Date(loginTime);
      logoutTime.setHours(17, Math.floor(Math.random() * 30), 0, 0);

      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          loginTime,
          logoutTime,
          duration: Math.floor((logoutTime.getTime() - loginTime.getTime()) / 60000),
          ipAddress: "192.168.1." + Math.floor(Math.random() * 254 + 1),
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
    }
  }

  console.log("✅ Created login history");
  console.log("🎉 Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
