export type AttendanceBootstrapData = {
  attendance: any[];
  stats: any | null;
  loginHistory: any[];
  historyPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  leaveRequests: any[];
};

export function shouldFetchAttendanceBootstrap(initialData: AttendanceBootstrapData | null) {
  return !initialData;
}
