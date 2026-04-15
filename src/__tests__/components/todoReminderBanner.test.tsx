import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodoReminderBanner } from "@/components/todos/TodoReminderBanner";

describe("TodoReminderBanner", () => {
  it("does not render when reminder data has no overdue or due-today items", () => {
    const html = renderToStaticMarkup(
      <TodoReminderBanner
        initialReminder={{
          overdue: { count: 0, items: [] },
          dueToday: { count: 0, items: [] },
        }}
        onViewOverdue={() => undefined}
      />,
    );

    expect(html).toBe("");
  });
});
