'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";

export default function StackProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider
      app={{
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      } as any}
      theme={StackTheme.withDefault()}
    >
      {children}
    </StackProvider>
  );
}
