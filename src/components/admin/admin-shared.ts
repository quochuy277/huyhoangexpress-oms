import React from "react";

/* ============================================================
   Shared types
   ============================================================ */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string | null;
  hometown: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  citizenId: string | null;
  phone: string | null;
  socialLink: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissionGroup: { id: string; name: string } | null;
}

export interface PermGroupRow {
  id: string;
  name: string;
  description: string | null;
  isSystemGroup: boolean;
  _count: { users: number };
  [key: string]: any;
}

export interface ChangeReq {
  id: string;
  userId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

/* ============================================================
   Shared hardcoded styles -- EXACT match with AddTodoDialog
   ============================================================ */
export const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  backgroundColor: "rgba(0,0,0,0.5)",
};

export const dialogBase: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 9999,
  maxWidth: "calc(100vw - 32px)",
  background: "#FFFFFF",
  border: "1.5px solid #2563EB",
  borderRadius: "12px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
};

export const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "16px",
  marginBottom: "20px",
};

export const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#1a1a1a",
};

export const closeBtnBase: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "6px",
  color: "#666",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.2s, background 0.2s",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1.5px solid #d1d5db",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

export const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "24px",
  borderTop: "1px solid #e5e7eb",
  paddingTop: "16px",
};

export const cancelBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #d1d5db",
  color: "#374151",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.2s",
};

export const primaryBtnStyle: React.CSSProperties = {
  background: "#2563EB",
  color: "#FFFFFF",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "background 0.2s",
};

export const dangerBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  background: "#dc2626",
};

/* Focus / blur handlers */
export const iFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#2563EB";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
};
export const iBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#d1d5db";
  e.currentTarget.style.boxShadow = "none";
};

/* Reusable close button hover */
export const closeHoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "#1a1a1a";
  e.currentTarget.style.background = "#f3f4f6";
};
export const closeHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "#666";
  e.currentTarget.style.background = "none";
};
