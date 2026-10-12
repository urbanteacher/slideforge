// The show's safety net: if drawing the show or running its room throws, the shell is told (so it can host the
// lesson the classic way) instead of leaving a dead black screen over the editor.

import { Component, type ReactNode } from 'react';

interface Props { onError: (reason: string) => void; children: ReactNode }

export class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError(`The studio's show stopped (${error instanceof Error ? error.message : String(error)})`);
  }
  render() { return this.state.failed ? null : this.props.children; }
}
