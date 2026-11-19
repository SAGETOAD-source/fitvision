"use client";

import React, { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/auth_context";

export interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
