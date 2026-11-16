import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Keeps one broken section from blanking the whole terminal. */
export class ErrorBoundary extends Component<{ label: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="border border-term-red/60 bg-term-red/10 px-3 py-2 my-2 text-[12px]">
        <b className="text-term-red">{this.props.label}: erro ao desenhar esta secção.</b>{' '}
        <span className="text-term-muted">{this.state.error.message}</span>{' '}
        <button className="underline text-term-amber" onClick={() => this.setState({ error: null })}>
          tentar outra vez
        </button>
      </div>
    )
  }
}
