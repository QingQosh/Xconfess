"use client";

import { useState } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/app/components/common/ErrorState";

export default function ComponentPlaygroundPage() {
  const [retryCount, setRetryCount] = useState(0);

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Component playground unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          This catalog is only available in development.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-6 p-6 text-foreground sm:p-10">
      <header>
        <p className="text-sm text-muted-foreground">Development tools</p>
        <h1 className="mt-1 text-3xl font-semibold">Component playground</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Review shared UI states in isolation. Every example uses local content
          and does not call the backend.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Loading</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" role="status" aria-label="Loading preview">
              <span className="sr-only">Loading preview</span>
              <Skeleton className="h-5 w-2/3" aria-hidden="true" />
              <Skeleton className="h-4 w-full" aria-hidden="true" />
              <Skeleton className="h-4 w-4/5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Empty</h2>
          </CardHeader>
          <CardContent>
            <Empty className="border" role="status" aria-label="Empty preview">
              <EmptyHeader>
                <EmptyTitle>
                  <h3 className="text-lg font-medium">No confessions yet</h3>
                </EmptyTitle>
                <EmptyDescription>
                  New posts will appear here when they are available.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline">
                  Browse feed
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Error and retry</h2>
          </CardHeader>
          <CardContent>
            <div role="alert">
              <ErrorState
                title="Could not load preview"
                description={`Local retry count: ${retryCount}`}
                error="The example is intentionally offline."
                onRetry={() => setRetryCount((count) => count + 1)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Disabled form controls</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="disabled-preview-input">Email address</label>
              <Input
                id="disabled-preview-input"
                type="email"
                value="preview@example.com"
                disabled
                readOnly
              />
            </div>
            <Button type="button" disabled>
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">Mixed-direction user content</h2>
          </CardHeader>
          <CardContent>
            <p className="max-w-prose rounded-md border p-4">
              <bdi dir="auto">مرحبا — hello @world</bdi>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
