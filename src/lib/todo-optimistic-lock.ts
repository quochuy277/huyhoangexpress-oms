import { NextResponse } from "next/server";

export const TODO_VERSION_REQUIRED_MESSAGE =
  "Thi\u1ebfu phi\u00ean b\u1ea3n d\u1eef li\u1ec7u. Vui l\u00f2ng t\u1ea3i l\u1ea1i v\u00e0 th\u1eed l\u1ea1i.";

export const TODO_CONFLICT_MESSAGE =
  "C\u00f4ng vi\u1ec7c \u0111\u00e3 \u0111\u01b0\u1ee3c ng\u01b0\u1eddi kh\u00e1c c\u1eadp nh\u1eadt. Vui l\u00f2ng t\u1ea3i l\u1ea1i v\u00e0 th\u1eed l\u1ea1i.";

export function readTodoVersion(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function todoVersionRequiredResponse() {
  return NextResponse.json({ error: TODO_VERSION_REQUIRED_MESSAGE }, { status: 400 });
}

export function todoConflictResponse() {
  return NextResponse.json({ error: TODO_CONFLICT_MESSAGE }, { status: 409 });
}

export class TodoConflictError extends Error {
  constructor() {
    super(TODO_CONFLICT_MESSAGE);
    this.name = "TodoConflictError";
  }
}
