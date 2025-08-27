import React from 'react';
import App from './App';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('Web ErrorBoundary caught:', error, info);
  }
  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div style={{ padding: 16, fontFamily: 'monospace' }}>
          <h2>WadaTrip Web Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error?.message || error)}</pre>
          {info?.componentStack && (
            <details open>
              <summary>Component stack</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{info.componentStack}</pre>
            </details>
          )}
          <p>Try a hard reload (Ctrl+Shift+R). If it persists, share the error above.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WebApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
