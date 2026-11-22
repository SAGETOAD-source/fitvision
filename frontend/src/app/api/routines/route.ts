import { NextRequest } from "next/server";
import {
  isBodyGoal,
  isFocusArea,
  isRoutineResponse,
} from "@/lib/auth_contracts";
import {
  backendFailure,
  backendFetch,
  jsonBody,
  networkFailure,
  noStoreJson,
} from "@/lib/server/backend_api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const goal = searchParams.get("goal");
  const focus = searchParams.get("focus");

  if (!goal || !isBodyGoal(goal)) {
    return noStoreJson(
      {
        error: "ValidationError",
        detail: "Query parameter 'goal' must be one of: slim, muscular, bulk.",
      },
      422
    );
  }

  if (
    focus !== null &&
    focus !== undefined &&
    focus !== "" &&
    !isFocusArea(focus)
  ) {
    return noStoreJson(
      {
        error: "ValidationError",
        detail:
          "Query parameter 'focus' must be one of: legs, upper_body, core, or omitted for balanced.",
      },
      422
    );
  }

  const queryParams = new URLSearchParams();
  queryParams.set("goal", goal);
  if (focus) {
    queryParams.set("focus", focus);
  }

  try {
    const backendRes = await backendFetch(
      `/v1/routines?${queryParams.toString()}`
    );
    const backendData = await jsonBody(backendRes);

    if (!backendRes.ok) {
      return backendFailure(backendRes, backendData);
    }

    if (!isRoutineResponse(backendData)) {
      return noStoreJson(
        { error: "BackendError", detail: "Invalid routine data format received." },
        502
      );
    }

    return noStoreJson(
      {
        routine: {
          goal: backendData.goal,
          focus: backendData.focus ?? null,
          exercises: backendData.exercises,
        },
      },
      200
    );
  } catch {
    return networkFailure();
  }
}
