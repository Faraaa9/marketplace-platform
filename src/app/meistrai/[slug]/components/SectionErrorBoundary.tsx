"use client";

import { Component, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Wraps a streamed (Suspense) profile section. If the async section throws —
 * a failed query, a slow timeout surfaced as an error — this renders a quiet
 * fallback card instead of bubbling up and breaking the whole profile route
 * or leaving the Suspense skeleton hanging forever.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
          <h2 className="mb-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
            {this.props.title}
          </h2>
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            Šios dalies nepavyko įkelti. Atnaujinkite puslapį ir pabandykite dar kartą.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
