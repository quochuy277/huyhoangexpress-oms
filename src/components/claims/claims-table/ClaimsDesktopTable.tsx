type ClaimsDesktopTableProps = {
  children: React.ReactNode;
};

export function ClaimsDesktopTable({ children }: ClaimsDesktopTableProps) {
  return (
    <div className="claims-desktop-table" style={{ overflowX: "auto" }}>
      {children}
    </div>
  );
}
