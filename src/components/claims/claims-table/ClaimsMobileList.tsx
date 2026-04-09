type ClaimsMobileListProps = {
  children: React.ReactNode;
};

export function ClaimsMobileList({ children }: ClaimsMobileListProps) {
  return (
    <div className="claims-mobile-list" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px" }}>
      {children}
    </div>
  );
}
