type ClaimsMobileListProps = {
  children: React.ReactNode;
};

export function ClaimsMobileList({ children }: ClaimsMobileListProps) {
  return (
    <div className="claims-mobile-list" style={{ display: "none", flexDirection: "column", gap: "10px", padding: "10px" }}>
      {children}
    </div>
  );
}
