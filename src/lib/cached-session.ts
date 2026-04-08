import { cache } from "react";

import { auth } from "@/lib/auth";

export const getCachedSession = cache(() => auth());
